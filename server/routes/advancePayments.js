const express = require('express');
const router = express.Router();
const AdvancePayment = require('../models/AdvancePayment');
const User = require('../models/User');
const { adminAuth } = require('../middleware/adminAuth');
const WeeklyCalculationService = require('../services/WeeklyCalculationService');
const moment = require('moment');

// Get all advance payments
router.get('/', adminAuth, async (req, res) => {
  try {
    const payments = await AdvancePayment.find()
      .populate('user', 'name email')
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching advance payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add advance payment
router.post('/', adminAuth, async (req, res) => {
  try {
    const { userId, amount, notes } = req.body;
    
    if (!userId || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ message: 'User ID and valid amount are required' });
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ message: 'Amount must be a valid number' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create advance payment record
    const advancePayment = new AdvancePayment({
      user: userId,
      amount: numericAmount,
      notes: notes || '',
      addedBy: req.user.id
    });

    await advancePayment.save();

    console.log(`💰 Advance payment added: ${user.name} - Amount: $${numericAmount}`);

    // Trigger recalculation from the week when this advance payment was added
    try {
      await WeeklyCalculationService.recalculateFromAdvancePaymentDate(userId, advancePayment.date);
      console.log(`✅ Weekly balances recalculated for ${user.name} from ${moment(advancePayment.date).format('YYYY-MM-DD')}`);
    } catch (calcError) {
      console.error('❌ Error recalculating weekly balances:', calcError);
      // Don't fail the advance payment creation, but log the error
    }

    // Populate the response
    await advancePayment.populate('user', 'name email');
    await advancePayment.populate('addedBy', 'name email');

    res.status(201).json({
      message: 'Advance payment added successfully',
      payment: advancePayment
    });
  } catch (error) {
    console.error('Error adding advance payment:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get advance payments for a specific user
router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const payments = await AdvancePayment.find({ user: userId })
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching user advance payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete advance payment (admin only)
router.delete('/:paymentId', adminAuth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await AdvancePayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const paymentDate = payment.date;
    const paymentUserId = payment.user;

    await AdvancePayment.findByIdAndDelete(paymentId);

    // Trigger recalculation from the week when this advance payment was removed
    try {
      await WeeklyCalculationService.recalculateFromAdvancePaymentDate(paymentUserId, paymentDate);
      console.log(`✅ Weekly balances recalculated after deleting advance payment from ${moment(paymentDate).format('YYYY-MM-DD')}`);
    } catch (calcError) {
      console.error('❌ Error recalculating weekly balances after deletion:', calcError);
    }

    res.json({ message: 'Advance payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting advance payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;