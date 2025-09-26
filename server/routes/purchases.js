const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const Purchase = require('../models/Purchase');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all purchases for current user
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    let dateFilter = { user: req.user._id };

    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const start = moment(`${year}-${month}-01`).startOf('month').toDate();
      const end = moment(`${year}-${month}-01`).endOf('month').toDate();
      dateFilter.date = { $gte: start, $lte: end };
    }

    const purchases = await Purchase.find(dateFilter)
      .populate('user', 'name email')
      .sort({ date: -1 });

    const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    res.json({ 
      purchases,
      totalAmount,
      count: purchases.length
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ message: 'Server error fetching purchases' });
  }
});

// Get all purchases (admin only)
router.get('/all', [auth, adminAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const purchases = await Purchase.find(dateFilter)
      .populate('user', 'name email')
      .sort({ date: -1 });

    const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    res.json({ 
      purchases,
      totalAmount,
      count: purchases.length
    });
  } catch (error) {
    console.error('Get all purchases error:', error);
    res.status(500).json({ message: 'Server error fetching all purchases' });
  }
});

// Add a new purchase
router.post('/', [
  auth,
  body('date').isISO8601().withMessage('Please provide a valid date'),
  body('amount').isNumeric().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, amount, notes } = req.body;

    const purchase = new Purchase({
      user: req.user._id,
      date: moment(date).startOf('day').toDate(),
      amount: parseFloat(amount),
      notes: notes || ''
    });

    await purchase.save();
    await purchase.populate('user', 'name email');

    res.status(201).json({
      message: 'Purchase added successfully',
      purchase
    });
  } catch (error) {
    console.error('Add purchase error:', error);
    res.status(500).json({ message: 'Server error adding purchase' });
  }
});

// Update a purchase
router.put('/:id', [
  auth,
  body('amount').optional().isNumeric().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Check if user owns this purchase
    if (purchase.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { amount, notes } = req.body;
    
    if (amount !== undefined) purchase.amount = parseFloat(amount);
    if (notes !== undefined) purchase.notes = notes;

    await purchase.save();
    await purchase.populate('user', 'name email');

    res.json({
      message: 'Purchase updated successfully',
      purchase
    });
  } catch (error) {
    console.error('Update purchase error:', error);
    res.status(500).json({ message: 'Server error updating purchase' });
  }
});

// Delete a purchase
router.delete('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Check if user owns this purchase
    if (purchase.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Purchase.findByIdAndDelete(req.params.id);

    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ message: 'Server error deleting purchase' });
  }
});

// Get purchase statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = { user: req.user._id };

    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const purchases = await Purchase.find(dateFilter);
    
    const stats = {
      totalAmount: purchases.reduce((sum, purchase) => sum + purchase.amount, 0),
      totalPurchases: purchases.length,
      averageAmount: purchases.length > 0 ? 
        purchases.reduce((sum, purchase) => sum + purchase.amount, 0) / purchases.length : 0,
      dailyBreakdown: {}
    };

    // Group by date for daily breakdown
    purchases.forEach(purchase => {
      const dateKey = moment(purchase.date).format('YYYY-MM-DD');
      if (!stats.dailyBreakdown[dateKey]) {
        stats.dailyBreakdown[dateKey] = {
          date: dateKey,
          amount: 0,
          count: 0
        };
      }
      stats.dailyBreakdown[dateKey].amount += purchase.amount;
      stats.dailyBreakdown[dateKey].count += 1;
    });

    res.json({ stats });
  } catch (error) {
    console.error('Get purchase stats error:', error);
    res.status(500).json({ message: 'Server error fetching purchase statistics' });
  }
});

module.exports = router;