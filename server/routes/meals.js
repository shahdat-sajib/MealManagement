const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const Meal = require('../models/Meal');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all meals for current user
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

    const meals = await Meal.find(dateFilter)
      .populate('user', 'name email')
      .sort({ date: -1 });

    res.json({ meals });
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ message: 'Server error fetching meals' });
  }
});

// Get all users (admin only) - for meal assignment
router.get('/users', [auth, adminAuth], async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({}).select('_id name email role').sort({ name: 1 });
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Get all meals (admin only)
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

    const meals = await Meal.find(dateFilter)
      .populate('user', 'name email')
      .sort({ date: -1 });

    res.json({ meals });
  } catch (error) {
    console.error('Get all meals error:', error);
    res.status(500).json({ message: 'Server error fetching all meals' });
  }
});

// Add a new meal for any user (admin) or current user
router.post('/', [
  auth,
  body('date').isISO8601().withMessage('Please provide a valid date'),
  body('description').optional().trim(),
  body('userId').optional().isMongoId().withMessage('Please provide a valid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, description, mealType, userId } = req.body;
    const mealDate = moment(date).startOf('day').toDate();
    const currentDate = moment().startOf('day').toDate();
    
    // Determine target user - admin can add for any user, regular users for themselves
    const targetUserId = req.user.role === 'admin' && userId ? userId : req.user._id;
    
    // Admin users can bypass date restrictions
    if (req.user.role !== 'admin') {
      // Check if trying to add meal for past dates
      if (moment(mealDate).isBefore(currentDate, 'day')) {
        return res.status(400).json({ 
          message: 'Cannot add meals for past dates' 
        });
      }

      // Check if trying to schedule meal more than 15 days in advance
      const maxAdvanceDate = moment().add(15, 'days').startOf('day').toDate();
      if (moment(mealDate).isAfter(maxAdvanceDate)) {
        return res.status(400).json({ 
          message: 'Cannot schedule meals more than 15 days in advance' 
        });
      }
    }

    // Check if meal already exists for this date
    const existingMeal = await Meal.findOne({
      user: targetUserId,
      date: mealDate
    });

    if (existingMeal) {
      return res.status(400).json({ 
        message: 'Meal already exists for this date' 
      });
    }

    const meal = new Meal({
      user: targetUserId,
      date: mealDate,
      description: description || `${mealType || 'breakfast'} meal`,
      mealType: mealType || 'breakfast',
      isScheduled: moment(mealDate).isAfter(currentDate),
      addedBy: req.user._id // Track who added the meal
    });

    await meal.save();
    await meal.populate('user', 'name email');

    res.status(201).json({
      message: 'Meal added successfully',
      meal
    });
  } catch (error) {
    console.error('Add meal error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Meal already exists for this date' });
    }
    res.status(500).json({ message: 'Server error adding meal' });
  }
});

// Update a meal
router.put('/:id', [
  auth,
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    // Check if user owns this meal or is admin
    if (meal.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const mealDate = moment(meal.date).startOf('day');
    const currentDate = moment().startOf('day');

    // Admin can edit any meal, regular users have date restrictions
    if (req.user.role !== 'admin' && mealDate.isBefore(currentDate, 'day')) {
      return res.status(400).json({ 
        message: 'Cannot edit meals for past dates' 
      });
    }

    const { description, mealType } = req.body;
    
    if (description !== undefined) {
      meal.description = description || `${mealType || meal.mealType} meal`;
    }
    if (mealType) meal.mealType = mealType;

    await meal.save();
    await meal.populate('user', 'name email');

    res.json({
      message: 'Meal updated successfully',
      meal
    });
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ message: 'Server error updating meal' });
  }
});

// Delete a meal
router.delete('/:id', auth, async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    // Check if user owns this meal or is admin
    if (meal.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const mealDate = moment(meal.date).startOf('day');
    const currentDate = moment().startOf('day');

    // Admin can delete any meal, regular users have date restrictions
    if (req.user.role !== 'admin' && mealDate.isBefore(currentDate, 'day')) {
      return res.status(400).json({ 
        message: 'Cannot delete meals for past dates' 
      });
    }

    await Meal.findByIdAndDelete(req.params.id);

    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ message: 'Server error deleting meal' });
  }
});

// Get meal calendar data
router.get('/calendar/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(`${year}-${month}-01`).endOf('month').toDate();

    const meals = await Meal.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).select('date description mealType isScheduled');

    // Transform to calendar format
    const calendarData = meals.reduce((acc, meal) => {
      const dateKey = moment(meal.date).format('YYYY-MM-DD');
      acc[dateKey] = {
        id: meal._id,
        description: meal.description,
        mealType: meal.mealType,
        isScheduled: meal.isScheduled
      };
      return acc;
    }, {});

    res.json({ calendar: calendarData });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ message: 'Server error fetching calendar data' });
  }
});

module.exports = router;