const express = require('express');
const moment = require('moment');
const Meal = require('../models/Meal');
const Purchase = require('../models/Purchase');
const User = require('../models/User');
const WeeklyBalance = require('../models/WeeklyBalance');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const WeeklyCalculationService = require('../services/WeeklyCalculationService');

const router = express.Router();

// Get dashboard data for current user
router.get('/', auth, async (req, res) => {
  try {
    const { week, month, year } = req.query;

    // Determine target month/year
    const targetYear = year ? parseInt(year) : moment().year();
    const targetMonth = month ? parseInt(month) : moment().month() + 1; // 1-based

    // Compute all week boundaries for target month (include week 5 when needed)
    const monthWeeks = WeeklyCalculationService.getWeekBoundaries(
      moment().year(targetYear).month(targetMonth - 1).date(1).toDate()
    );

    // Determine requested week number (fallback: infer current date week)
    let targetWeekNum;
    if (week) {
      targetWeekNum = parseInt(week);
    } else {
      const today = moment();
      const foundWeek = monthWeeks.find(w => today.isBetween(moment(w.weekStart), moment(w.weekEnd), null, '[]'));
      targetWeekNum = foundWeek ? foundWeek.week : monthWeeks[0].week;
    }

    const targetWeekInfo = monthWeeks.find(w => w.week === targetWeekNum) || monthWeeks[0];

    // Fetch or calculate the weekly balance for this user & week
    let weeklyRecord = await WeeklyBalance.findOne({
      user: req.user._id,
      year: targetWeekInfo.year,
      month: targetWeekInfo.month,
      week: targetWeekInfo.week
    });

    if (!weeklyRecord) {
      // On-demand calculation if not present yet
      const calcData = await WeeklyCalculationService.calculateWeeklyBalance(req.user._id, targetWeekInfo);
      weeklyRecord = await WeeklyBalance.findOneAndUpdate(
        { user: req.user._id, year: targetWeekInfo.year, month: targetWeekInfo.month, week: targetWeekInfo.week },
        calcData,
        { upsert: true, new: true }
      );
    }

    // Build daily breakdown for selected week from raw data (for UI detail view)
    const [userMeals, userPurchases, allMeals, allPurchases] = await Promise.all([
      Meal.find({ user: req.user._id, date: { $gte: targetWeekInfo.weekStart, $lte: targetWeekInfo.weekEnd } }),
      Purchase.find({ user: req.user._id, date: { $gte: targetWeekInfo.weekStart, $lte: targetWeekInfo.weekEnd } }),
      Meal.find({ date: { $gte: targetWeekInfo.weekStart, $lte: targetWeekInfo.weekEnd } }),
      Purchase.find({ date: { $gte: targetWeekInfo.weekStart, $lte: targetWeekInfo.weekEnd } })
    ]);

    const mealsByDate = {};
    allMeals.forEach(meal => {
      const k = moment(meal.date).format('YYYY-MM-DD');
      mealsByDate[k] = (mealsByDate[k] || 0) + 1;
    });
    const purchasesByDate = {};
    allPurchases.forEach(p => {
      const k = moment(p.date).format('YYYY-MM-DD');
      purchasesByDate[k] = (purchasesByDate[k] || 0) + p.amount;
    });
    const userMealsByDate = {};
    userMeals.forEach(m => {
      const k = moment(m.date).format('YYYY-MM-DD');
      userMealsByDate[k] = (userMealsByDate[k] || 0) + 1;
    });
    const dailyBreakdown = Object.keys(userMealsByDate).map(dateKey => {
      const dayTotalMeals = mealsByDate[dateKey] || 1;
      const dayTotalPurchases = purchasesByDate[dateKey] || 0;
      const costPerMeal = dayTotalPurchases / dayTotalMeals;
      const userMealsCount = userMealsByDate[dateKey];
      const userExpense = userMealsCount * costPerMeal;
      return {
        date: dateKey,
        totalMeals: dayTotalMeals,
        totalPurchases: dayTotalPurchases,
        costPerMeal,
        userMeals: userMealsCount,
        userExpense
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Monthly weekly breakdown (all weeks for month) via service so carry-forward chain is visible
    const monthlyWeeklyBreakdown = await WeeklyCalculationService.getUserWeeklyBreakdown(
      req.user._id,
      targetYear,
      targetMonth
    );

    // Summary for user dashboard - clear display according to requirements
    const summary = {
      // Week info
      week: `Week ${weeklyRecord.week}`,
      weekStart: moment(weeklyRecord.weekStart).format('MMM DD'),
      weekEnd: moment(weeklyRecord.weekEnd).format('MMM DD'),
      monthYear: moment().year(targetYear).month(targetMonth - 1).format('MMMM YYYY'),
      
      // Weekly data (starts from 0 each week)
      totalMeals: weeklyRecord.totalMeals, // Total meal count for this week
      totalPurchases: weeklyRecord.totalPurchases, // Total purchase within the week
      totalAdvancePayments: weeklyRecord.totalAdvancePayments, // Advance payments added this week
      totalExpense: weeklyRecord.totalExpense, // Total meal cost for this week
      
      // Advance Balance calculation
      previousAdvance: weeklyRecord.advanceFromPreviousWeek, // Previous carry forward advance
      advanceBalance: weeklyRecord.advanceBalance, // Total advance available (previous + payments + purchases)
      
      // Final Calculation
      finalCalculation: weeklyRecord.weeklyBalance, // Advance Balance - Meal Cost
      isDue: weeklyRecord.isDue,
      finalAmount: weeklyRecord.finalAmount,
      status: weeklyRecord.status,
      
      // Next week carry forward
      carryForwardAdvance: weeklyRecord.advanceToNextWeek
    };

    res.json({
      summary,
      weeklyBreakdown: monthlyWeeklyBreakdown, // maintains month view
      dailyBreakdown,
      systemStats: {
        calculationMethod: 'Weekly Reset System',
        advanceSystem: 'Carry-forward Credit/Due',
        weeksInMonth: monthWeeks.length
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get admin dashboard with all users' data
router.get('/admin', [auth, adminAuth], async (req, res) => {
  try {
    const { week, month, year } = req.query;
    const targetYear = year ? parseInt(year) : moment().year();
    const targetMonth = month ? parseInt(month) : moment().month() + 1;
    const monthWeeks = WeeklyCalculationService.getWeekBoundaries(
      moment().year(targetYear).month(targetMonth - 1).date(1).toDate()
    );
    let targetWeekNum;
    if (week) {
      targetWeekNum = parseInt(week);
    } else {
      const today = moment();
      const w = monthWeeks.find(wk => today.isBetween(moment(wk.weekStart), moment(wk.weekEnd), null, '[]'));
      targetWeekNum = w ? w.week : monthWeeks[0].week;
    }
    const targetWeekInfo = monthWeeks.find(w => w.week === targetWeekNum) || monthWeeks[0];

    // Get all users
    const users = await User.find({}).select('name email role');
    const userBreakdown = [];

    for (const user of users) {
      // Fetch or compute weekly record for each user
      let record = await WeeklyBalance.findOne({
        user: user._id,
        year: targetWeekInfo.year,
        month: targetWeekInfo.month,
        week: targetWeekInfo.week
      });
      if (!record) {
        const calcData = await WeeklyCalculationService.calculateWeeklyBalance(user._id, targetWeekInfo);
        record = await WeeklyBalance.findOneAndUpdate(
          { user: user._id, year: targetWeekInfo.year, month: targetWeekInfo.month, week: targetWeekInfo.week },
          calcData,
          { upsert: true, new: true }
        );
      }
      userBreakdown.push({
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        
        // Week info
        week: record.week,
        weekStart: moment(record.weekStart).format('MMM DD'),
        weekEnd: moment(record.weekEnd).format('MMM DD'),
        
        // Weekly data (starts from 0 each week)
        totalMeals: record.totalMeals, // Total meal count for this week
        totalPurchases: record.totalPurchases, // Total purchase within the week
        totalAdvancePayments: record.totalAdvancePayments, // Advance payments added this week
        totalExpense: record.totalExpense, // Total meal cost for this week
        
        // Advance Balance calculation
        previousAdvance: record.advanceFromPreviousWeek, // Previous carry forward advance
        advanceBalance: record.advanceBalance, // Total advance available
        
        // Final Calculation
        finalCalculation: record.weeklyBalance, // Advance Balance - Meal Cost
        isDue: record.isDue,
        finalAmount: record.finalAmount,
        status: record.status,
        
        // Next week carry forward
        carryForwardAdvance: record.advanceToNextWeek
      });
    }

    // Calculate weekly totals from all users
    const totalMeals = userBreakdown.reduce((s, u) => s + u.totalMeals, 0);
    const totalPurchases = userBreakdown.reduce((s, u) => s + u.totalPurchases, 0);
    const totalAdvancePayments = userBreakdown.reduce((s, u) => s + u.totalAdvancePayments, 0);
    const totalExpense = userBreakdown.reduce((s, u) => s + u.totalExpense, 0);
    const totalAdvanceBalance = userBreakdown.reduce((s, u) => s + u.advanceBalance, 0);
    const totalCredit = userBreakdown.filter(u => !u.isDue).reduce((s, u) => s + u.finalAmount, 0);
    const totalDue = userBreakdown.filter(u => u.isDue).reduce((s, u) => s + u.finalAmount, 0);
    const totalCarryForward = userBreakdown.reduce((s, u) => s + u.carryForwardAdvance, 0);

    res.json({
      // Weekly totals breakdown for admin
      weeklyTotals: {
        week: `Week ${targetWeekInfo.week}`,
        weekRange: `${moment(targetWeekInfo.weekStart).format('MMM DD')} - ${moment(targetWeekInfo.weekEnd).format('MMM DD')}`,
        monthYear: moment().year(targetYear).month(targetMonth - 1).format('MMMM YYYY'),
        
        // All totals for this week
        totalUsers: users.length,
        totalMeals,
        totalPurchases,
        totalAdvancePayments,
        totalExpense,
        totalAdvanceBalance,
        totalCredit,
        totalDue,
        totalCarryForward,
        netBalance: totalCredit - totalDue
      },
      
      // User breakdown for this week
      userBreakdown: userBreakdown.sort((a, b) => b.finalCalculation - a.finalCalculation),
      
      // Additional info
      weeksInMonth: monthWeeks.length,
      calculationMethod: 'Weekly Reset System'
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching admin dashboard data' });
  }
});

// Get expense history for charts
router.get('/history', auth, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const monthsBack = parseInt(months);
    
    const startDate = moment().subtract(monthsBack, 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();
    
    const [userMeals, userPurchases] = await Promise.all([
      Meal.find({ 
        user: req.user._id, 
        date: { $gte: startDate, $lte: endDate } 
      }),
      Purchase.find({ 
        user: req.user._id, 
        date: { $gte: startDate, $lte: endDate } 
      })
    ]);

    // Group by month
    const monthlyData = {};
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month');
      const monthKey = monthStart.format('YYYY-MM');
      monthlyData[monthKey] = {
        month: monthStart.format('MMM YYYY'),
        meals: 0,
        purchases: 0
      };
    }

    // Add current month
    const currentMonth = moment().format('YYYY-MM');
    monthlyData[currentMonth] = {
      month: moment().format('MMM YYYY'),
      meals: 0,
      purchases: 0
    };

    // Populate with actual data
    userMeals.forEach(meal => {
      const monthKey = moment(meal.date).format('YYYY-MM');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].meals++;
      }
    });

    userPurchases.forEach(purchase => {
      const monthKey = moment(purchase.date).format('YYYY-MM');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].purchases += purchase.amount;
      }
    });

    const history = Object.keys(monthlyData)
      .sort()
      .map(key => monthlyData[key]);

    res.json({ history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Server error fetching expense history' });
  }
});

// Get new weekly dashboard data for current user
router.get('/weekly', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Default to current month if not specified
    const targetYear = year ? parseInt(year) : moment().year();
    const targetMonth = month ? parseInt(month) : moment().month() + 1;
    
    // Get user's weekly breakdown
    const weeklyBreakdown = await WeeklyCalculationService.getUserWeeklyBreakdown(
      req.user._id, 
      targetYear, 
      targetMonth
    );
    
    // Calculate summary
    const summary = weeklyBreakdown.reduce((acc, week) => ({
      totalMeals: acc.totalMeals + week.meals,
      totalPurchases: acc.totalPurchases + week.purchases,
      totalAdvancePayments: acc.totalAdvancePayments + (week.advancePayments || 0),
      totalExpense: acc.totalExpense + week.expense,
      totalAdvanceReceived: acc.totalAdvanceReceived + week.advanceFromPrevious,
      totalAdvanceGenerated: acc.totalAdvanceGenerated + week.advanceViaPurchase,
      totalAdvanceFromPayments: acc.totalAdvanceFromPayments + (week.advanceViaPayments || 0)
    }), {
      totalMeals: 0,
      totalPurchases: 0,
      totalAdvancePayments: 0,
      totalExpense: 0,
      totalAdvanceReceived: 0,
      totalAdvanceGenerated: 0,
      totalAdvanceFromPayments: 0
    });
    
    // Calculate current advance balance from weekly system
    const advanceBalance = await WeeklyCalculationService.getCurrentUserAdvanceBalance(req.user._id);
    
    res.json({
      summary: {
        ...summary,
        advanceBalance,
        monthYear: moment().year(targetYear).month(targetMonth - 1).format('MMMM YYYY')
      },
      weeklyBreakdown,
      systemStats: {
        calculationMethod: 'Weekly Reset System',
        advanceSystem: 'Purchase-based Auto Advance'
      }
    });
    
  } catch (error) {
    console.error('Weekly dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching weekly dashboard data' });
  }
});

// Get enhanced admin dashboard with comprehensive meal tracking
router.get('/admin/enhanced', [auth, adminAuth], async (req, res) => {
  try {
    const { year, month, week } = req.query;
    
    // Default to current month if not specified
    const targetYear = year ? parseInt(year) : moment().year();
    const targetMonth = month ? parseInt(month) : moment().month() + 1;
    const targetWeek = week ? parseInt(week) : null;
    
    const adminData = await WeeklyCalculationService.getAdminDashboardData(
      targetYear, 
      targetMonth, 
      targetWeek
    );
    
    // Get additional system statistics
    const WeeklyBalance = require('../models/WeeklyBalance');
    const systemStats = await WeeklyBalance.aggregate([
      {
        $match: {
          year: targetYear,
          month: targetMonth,
          ...(targetWeek && { week: targetWeek })
        }
      },
      {
        $group: {
          _id: null,
          totalDue: {
            $sum: {
              $cond: [{ $eq: ['$isDue', true] }, '$finalAmount', 0]
            }
          },
          totalCredit: {
            $sum: {
              $cond: [{ $eq: ['$isDue', false] }, '$finalAmount', 0]
            }
          },
          totalAdvanceGenerated: { $sum: '$advanceViaPurchase' },
          totalAdvanceUsed: { $sum: '$advanceFromPreviousWeek' }
        }
      }
    ]);
    
    const enhancedSystemStats = {
      ...adminData.summary,
      ...(systemStats[0] || {
        totalDue: 0,
        totalCredit: 0,
        totalAdvanceGenerated: 0,
        totalAdvanceUsed: 0
      }),
      netBalance: (systemStats[0]?.totalCredit || 0) - (systemStats[0]?.totalDue || 0),
      calculationMethod: 'Weekly Reset System',
      periodDescription: targetWeek 
        ? `Week ${targetWeek} of ${moment().year(targetYear).month(targetMonth - 1).format('MMMM YYYY')}`
        : moment().year(targetYear).month(targetMonth - 1).format('MMMM YYYY')
    };
    
    res.json({
      systemStats: enhancedSystemStats,
      userStats: adminData.userStats,
      weekStats: adminData.weekStats
    });
    
  } catch (error) {
    console.error('Enhanced admin dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching enhanced admin dashboard data' });
  }
});

// Get users with dynamic advance balance for advance payment management
router.get('/users-with-balance', [auth, adminAuth], async (req, res) => {
  try {
    const users = await User.find({}).select('name email role');
    const usersWithBalance = [];
    
    for (const user of users) {
      // Get current dynamic advance balance
      const advanceBalance = await WeeklyCalculationService.getCurrentUserAdvanceBalance(user._id);
      
      usersWithBalance.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        advanceBalance // Dynamic balance from weekly calculation
      });
    }
    
    res.json(usersWithBalance);
    
  } catch (error) {
    console.error('Error getting users with balance:', error);
    res.status(500).json({ message: 'Server error getting users with balance' });
  }
});

module.exports = router;