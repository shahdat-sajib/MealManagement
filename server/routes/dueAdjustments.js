const express = require('express');
const router = express.Router();
const DueAdjustment = require('../models/DueAdjustment');
const WeeklyBalance = require('../models/WeeklyBalance');
const User = require('../models/User');
const { adminAuth } = require('../middleware/adminAuth');
const WeeklyCalculationService = require('../services/WeeklyCalculationService');
const moment = require('moment');

// Get all due adjustments
router.get('/', adminAuth, async (req, res) => {
  try {
    const { userId, year, month, week } = req.query;
    
    const filter = {};
    if (userId) filter.user = userId;
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);
    if (week) filter.week = parseInt(week);
    
    const adjustments = await DueAdjustment.find(filter)
      .populate('user', 'name email')
      .populate('addedBy', 'name email')
      .sort({ adjustmentDate: -1 });
    
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching due adjustments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Make direct due adjustment
router.post('/adjust', adminAuth, async (req, res) => {
  try {
    const { userId, year, month, week, adjustmentAmount, adjustmentType, reason, notes } = req.body;
    
    if (!userId || !year || !month || !week || adjustmentAmount === undefined || !adjustmentType || !reason) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    const numericAmount = parseFloat(adjustmentAmount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return res.status(400).json({ message: 'Adjustment amount must be a valid non-zero number' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get or create weekly balance record
    const weekBoundaries = WeeklyCalculationService.getWeekBoundaries(
      moment().year(year).month(month - 1).date(1).toDate()
    );
    const targetWeek = weekBoundaries.find(w => w.week === week);
    
    if (!targetWeek) {
      return res.status(400).json({ message: 'Invalid week specified' });
    }
    
    // Calculate or get existing weekly balance
    let weeklyBalance = await WeeklyBalance.findOne({
      user: userId,
      year: year,
      month: month,
      week: week
    });
    
    if (!weeklyBalance) {
      // Calculate the weekly balance first
      const calculatedData = await WeeklyCalculationService.calculateWeeklyBalance(userId, targetWeek);
      weeklyBalance = await WeeklyBalance.create(calculatedData);
    }
    
    const previousBalance = weeklyBalance.adjustedBalance || weeklyBalance.weeklyBalance;
    let newBalance;
    
    // Apply adjustment based on type
    switch (adjustmentType) {
      case 'credit':
        newBalance = previousBalance + numericAmount;
        break;
      case 'debit':
        newBalance = previousBalance - numericAmount;
        break;
      case 'clear_due':
        newBalance = 0; // Clear the due completely
        break;
      default:
        return res.status(400).json({ message: 'Invalid adjustment type' });
    }
    
    // Create adjustment record
    const adjustment = new DueAdjustment({
      user: userId,
      year: year,
      month: month,
      week: week,
      adjustmentAmount: numericAmount,
      adjustmentType: adjustmentType,
      previousBalance: previousBalance,
      newBalance: newBalance,
      reason: reason,
      notes: notes || '',
      addedBy: req.user.id
    });
    
    await adjustment.save();
    
    // Update weekly balance with adjustment
    const totalAdjustments = (weeklyBalance.totalDueAdjustments || 0) + 
      (adjustmentType === 'credit' ? numericAmount : 
       adjustmentType === 'debit' ? -numericAmount : 
       -previousBalance); // For clear_due, subtract the entire previous balance
    
    weeklyBalance.totalDueAdjustments = totalAdjustments;
    weeklyBalance.adjustedBalance = newBalance;
    weeklyBalance.finalAmount = Math.abs(newBalance);
    weeklyBalance.isDue = newBalance < 0;
    weeklyBalance.status = newBalance < 0 ? 'Due' : (newBalance > 0 ? 'Credit' : 'Balanced');
    
    await weeklyBalance.save();
    
    console.log(`✅ Admin ${req.user.name} made due adjustment for user ${user.name}: ${adjustmentType} ${numericAmount} for Week ${week}/${month}/${year}`);
    
    // Populate the response
    await adjustment.populate('user', 'name email');
    await adjustment.populate('addedBy', 'name email');
    
    res.json({
      message: `Due adjustment applied successfully for ${user.name}`,
      adjustment: adjustment,
      updatedBalance: {
        previousBalance: previousBalance,
        newBalance: newBalance,
        totalAdjustments: totalAdjustments,
        status: weeklyBalance.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error making due adjustment:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's adjustment history
router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;
    
    const filter = { user: userId };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);
    
    const adjustments = await DueAdjustment.find(filter)
      .populate('addedBy', 'name email')
      .sort({ adjustmentDate: -1 });
    
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching user adjustments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete due adjustment (admin only)
router.delete('/:adjustmentId', adminAuth, async (req, res) => {
  try {
    const { adjustmentId } = req.params;
    
    const adjustment = await DueAdjustment.findById(adjustmentId);
    if (!adjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }
    
    // Reverse the adjustment in weekly balance
    const weeklyBalance = await WeeklyBalance.findOne({
      user: adjustment.user,
      year: adjustment.year,
      month: adjustment.month,
      week: adjustment.week
    });
    
    if (weeklyBalance) {
      // Reverse the adjustment
      let reversalAmount;
      switch (adjustment.adjustmentType) {
        case 'credit':
          reversalAmount = -adjustment.adjustmentAmount;
          break;
        case 'debit':
          reversalAmount = adjustment.adjustmentAmount;
          break;
        case 'clear_due':
          reversalAmount = adjustment.previousBalance;
          break;
      }
      
      weeklyBalance.totalDueAdjustments = (weeklyBalance.totalDueAdjustments || 0) + reversalAmount;
      weeklyBalance.adjustedBalance = adjustment.previousBalance;
      weeklyBalance.finalAmount = Math.abs(adjustment.previousBalance);
      weeklyBalance.isDue = adjustment.previousBalance < 0;
      weeklyBalance.status = adjustment.previousBalance < 0 ? 'Due' : 
                            (adjustment.previousBalance > 0 ? 'Credit' : 'Balanced');
      
      await weeklyBalance.save();
    }
    
    await DueAdjustment.findByIdAndDelete(adjustmentId);
    
    console.log(`✅ Due adjustment deleted and reversed: ${adjustmentId}`);
    
    res.json({ message: 'Due adjustment deleted and reversed successfully' });
  } catch (error) {
    console.error('Error deleting due adjustment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;