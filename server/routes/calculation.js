const express = require('express');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const WeeklyCalculationService = require('../services/WeeklyCalculationService');

const router = express.Router();

// Recalculate all weekly balances (Admin only)
router.post('/recalculate-all', [auth, adminAuth], async (req, res) => {
  try {
    console.log('🔄 Admin requested complete recalculation');
    
    const result = await WeeklyCalculationService.recalculateAllWeeksFromBeginning();
    
    res.json({
      message: 'All weekly balances recalculated successfully',
      processedCount: result.processedCount,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Recalculation error:', error);
    res.status(500).json({ 
      message: 'Error recalculating weekly balances',
      error: error.message 
    });
  }
});

// Recalculate for specific user from specific date (Admin only)
router.post('/recalculate-user', [auth, adminAuth], async (req, res) => {
  try {
    const { userId, fromDate } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const targetDate = fromDate ? new Date(fromDate) : new Date();
    
    console.log(`🔄 Admin requested recalculation for user ${userId} from ${targetDate}`);
    
    const result = await WeeklyCalculationService.recalculateFromAdvancePaymentDate(userId, targetDate);
    
    res.json({
      message: 'User weekly balances recalculated successfully',
      weeksRecalculated: result.weeksRecalculated,
      fromDate: targetDate,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ User recalculation error:', error);
    res.status(500).json({ 
      message: 'Error recalculating user weekly balances',
      error: error.message 
    });
  }
});

// Get system statistics (Admin only)
router.get('/system-stats', [auth, adminAuth], async (req, res) => {
  try {
    const WeeklyBalance = require('../models/WeeklyBalance');
    const User = require('../models/User');
    
    const [totalUsers, totalWeeks, lastCalculation] = await Promise.all([
      User.countDocuments(),
      WeeklyBalance.countDocuments(),
      WeeklyBalance.findOne().sort({ calculatedAt: -1 }).select('calculatedAt')
    ]);
    
    res.json({
      totalUsers,
      totalWeeklyRecords: totalWeeks,
      lastCalculationDate: lastCalculation ? lastCalculation.calculatedAt : null,
      systemStatus: totalWeeks > 0 ? 'Calculated' : 'Needs Calculation'
    });
    
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({ message: 'Server error getting system statistics' });
  }
});

module.exports = router;