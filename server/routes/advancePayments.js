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
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'User ID and valid amount are required' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create advance payment record
    const advancePayment = new AdvancePayment({
      user: userId,
      amount: parseFloat(amount),
      notes: notes || '',
      addedBy: req.user.id
    });

    await advancePayment.save();

    // Update user's advance balance
    user.advanceBalance += parseFloat(amount);
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
    res.status(500).json({ message: 'Server error' });
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