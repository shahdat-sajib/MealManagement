const express = require('express');
const moment = require('moment');
const PaymentReceipt = require('../models/PaymentReceipt');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const WeeklyCalculationService = require('../services/WeeklyCalculationService');

const router = express.Router();

// Get all payment receipts (Admin only)
router.get('/', [auth, adminAuth], async (req, res) => {
  try {
    const { year, month, week, userId } = req.query;
    
    let filter = {};
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);
    if (week) filter.week = parseInt(week);
    if (userId) filter.user = userId;
    
    const receipts = await PaymentReceipt.find(filter)
      .populate('user', 'name email role')
      .populate('addedBy', 'name')
      .sort({ paymentDate: -1 })
      .limit(100);
    
    res.json(receipts);
    
  } catch (error) {
    console.error('Error fetching payment receipts:', error);
    res.status(500).json({ message: 'Server error fetching payment receipts' });
  }
});

// Add new payment receipt (Admin only)
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const { userId, amount, paymentDate, paymentMethod, notes, week, month, year } = req.body;
    
    if (!userId || !amount || !paymentDate || !week || !month || !year) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const receipt = new PaymentReceipt({
      user: userId,
      amount: parseFloat(amount),
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      week: parseInt(week),
      month: parseInt(month),
      year: parseInt(year),
      addedBy: req.user._id
    });
    
    await receipt.save();
    
    // Populate the receipt for response
    await receipt.populate('user', 'name email role');
    await receipt.populate('addedBy', 'name');
    
    console.log(`✅ Payment receipt added: ${user.name} paid $${amount} for Week ${week}/${month}/${year}`);
    
    res.status(201).json({
      message: `Payment receipt added for ${user.name}`,
      receipt: receipt
    });
    
  } catch (error) {
    console.error('❌ Error adding payment receipt:', error);
    res.status(500).json({ message: 'Server error adding payment receipt' });
  }
});

// Update payment receipt (Admin only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod, notes, status } = req.body;
    
    const receipt = await PaymentReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Payment receipt not found' });
    }
    
    if (amount !== undefined) receipt.amount = parseFloat(amount);
    if (paymentDate !== undefined) receipt.paymentDate = new Date(paymentDate);
    if (paymentMethod !== undefined) receipt.paymentMethod = paymentMethod;
    if (notes !== undefined) receipt.notes = notes;
    if (status !== undefined) receipt.status = status;
    
    await receipt.save();
    await receipt.populate('user', 'name email role');
    await receipt.populate('addedBy', 'name');
    
    res.json({
      message: 'Payment receipt updated successfully',
      receipt: receipt
    });
    
  } catch (error) {
    console.error('Error updating payment receipt:', error);
    res.status(500).json({ message: 'Server error updating payment receipt' });
  }
});

// Delete payment receipt (Admin only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const receipt = await PaymentReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Payment receipt not found' });
    }
    
    await PaymentReceipt.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Payment receipt deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting payment receipt:', error);
    res.status(500).json({ message: 'Server error deleting payment receipt' });
  }
});

// Get user's payment receipts (User can see their own)
router.get('/my-receipts', auth, async (req, res) => {
  try {
    const receipts = await PaymentReceipt.find({ user: req.user._id })
      .populate('addedBy', 'name')
      .sort({ paymentDate: -1 })
      .limit(50);
    
    const formattedReceipts = receipts.map(receipt => ({
      _id: receipt._id,
      amount: receipt.amount,
      paymentDate: receipt.paymentDate,
      paymentMethod: receipt.paymentMethod,
      notes: receipt.notes,
      week: receipt.week,
      month: receipt.month,
      year: receipt.year,
      addedBy: receipt.addedBy ? receipt.addedBy.name : 'Admin',
      status: receipt.status,
      createdAt: receipt.createdAt
    }));
    
    res.json(formattedReceipts);
    
  } catch (error) {
    console.error('Error getting user payment receipts:', error);
    res.status(500).json({ message: 'Server error getting payment receipts' });
  }
});

// Get payment summary for a specific week/month/year
router.get('/summary', [auth, adminAuth], async (req, res) => {
  try {
    const { year, month, week } = req.query;
    
    let matchFilter = {};
    if (year) matchFilter.year = parseInt(year);
    if (month) matchFilter.month = parseInt(month);
    if (week) matchFilter.week = parseInt(week);
    
    const summary = await PaymentReceipt.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalReceipts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          totalAmount: 1,
          totalReceipts: 1,
          uniqueUsersCount: { $size: '$uniqueUsers' }
        }
      }
    ]);
    
    const result = summary[0] || {
      totalAmount: 0,
      totalReceipts: 0,
      uniqueUsersCount: 0
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('Error getting payment summary:', error);
    res.status(500).json({ message: 'Server error getting payment summary' });
  }
});

module.exports = router;