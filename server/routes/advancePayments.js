const express = require('express');
const router = express.Router();
const AdvancePayment = require('../models/AdvancePayment');
const User = require('../models/User');
const { adminAuth } = require('../middleware/adminAuth');

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

    // Update user's advance balance (allow negative amounts for deductions)
    const currentBalance = user.advanceBalance || 0;
    const newBalance = Math.max(0, currentBalance + numericAmount);
    user.advanceBalance = newBalance;
    
    console.log(`Balance update: ${user.name} - Current: $${currentBalance}, Change: $${numericAmount}, New: $${newBalance}`);
    
    await user.save();

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

    // Update user's advance balance
    const user = await User.findById(payment.user);
    if (user) {
      user.advanceBalance = Math.max(0, user.advanceBalance - payment.amount);
      await user.save();
    }

    await AdvancePayment.findByIdAndDelete(paymentId);

    res.json({ message: 'Advance payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting advance payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;