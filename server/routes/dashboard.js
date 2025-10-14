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
    const { startDate, endDate, week, month, year } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (week) {
      // Get specific week of current month (calendar-based weeks)
      const weekNum = parseInt(week);
      
      // Use current month/year if not specified
      const targetMonth = month ? parseInt(month) - 1 : moment().month(); // moment months are 0-based
      const targetYear = year ? parseInt(year) : moment().year();
      
      const monthStart = moment().year(targetYear).month(targetMonth).date(1).startOf('day');
      const monthEnd = moment().year(targetYear).month(targetMonth).endOf('month').endOf('day');
      
      let start, end;
      
      if (weekNum === 1) {
        // Week 1: 1st to 7th
        start = monthStart.clone().date(1);
        end = monthStart.clone().date(7).endOf('day');
      } else if (weekNum === 2) {
        // Week 2: 8th to 14th  
        start = monthStart.clone().date(8);
        end = monthStart.clone().date(14).endOf('day');
      } else if (weekNum === 3) {
        // Week 3: 15th to 21st
        start = monthStart.clone().date(15);
        end = monthStart.clone().date(21).endOf('day');
      } else if (weekNum === 4) {
        // Week 4: 22nd to end of month
        start = monthStart.clone().date(22);
        end = monthEnd.clone();
      } else {
        // Invalid week number, default to current week
        const now = moment();
        start = now.clone().startOf('week');
        end = now.clone().endOf('week');
      }
      
      // Ensure we don't go beyond the month boundaries
      if (end.isAfter(monthEnd)) {
        end = monthEnd.clone();
      }
      
      dateFilter = { $gte: start.toDate(), $lte: end.toDate() };
    } else {
      // Default to current week
      const start = moment().startOf('week').toDate();
      const end = moment().endOf('week').toDate();
      dateFilter = { $gte: start, $lte: end };
    }

    // Get user's meals, purchases, and advance balance
    const [userMeals, userPurchases, totalMeals, totalPurchases, user] = await Promise.all([
      Meal.find({ user: req.user._id, date: dateFilter }),
      Purchase.find({ user: req.user._id, date: dateFilter }),
      Meal.find({ date: dateFilter }),
      Purchase.find({ date: dateFilter }),
      User.findById(req.user._id)
    ]);

    // Calculate totals
    const userTotalMeals = userMeals.length;
    const userTotalPurchases = userPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const systemTotalMeals = totalMeals.length;
    const systemTotalPurchases = totalPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const userAdvanceBalance = user.advanceBalance || 0;

    // Calculate daily expense breakdown
    const dailyExpenseMap = new Map();
    
    // Group meals by date
    const mealsByDate = {};
    totalMeals.forEach(meal => {
      const dateKey = moment(meal.date).format('YYYY-MM-DD');
      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }
      mealsByDate[dateKey].push(meal);
    });

    // Group purchases by date
    const purchasesByDate = {};
    totalPurchases.forEach(purchase => {
      const dateKey = moment(purchase.date).format('YYYY-MM-DD');
      if (!purchasesByDate[dateKey]) {
        purchasesByDate[dateKey] = 0;
      }
      purchasesByDate[dateKey] += purchase.amount;
    });

    // Calculate daily costs
    let userTotalExpense = 0;
    const dailyBreakdown = [];

    Object.keys(mealsByDate).forEach(dateKey => {
      const dayMeals = mealsByDate[dateKey];
      const dayPurchases = purchasesByDate[dateKey] || 0;
      const dayMealCount = dayMeals.length;
      
      if (dayMealCount > 0) {
        const dailyCostPerMeal = dayPurchases / dayMealCount;
        const userMealsThisDay = dayMeals.filter(meal => 
          meal.user.toString() === req.user._id.toString()
        ).length;
        
        const userDayExpense = userMealsThisDay * dailyCostPerMeal;
        userTotalExpense += userDayExpense;

        dailyBreakdown.push({
          date: dateKey,
          totalMeals: dayMealCount,
          totalPurchases: dayPurchases,
          costPerMeal: dailyCostPerMeal,
          userMeals: userMealsThisDay,
          userExpense: userDayExpense
        });
      }
    });

    // Calculate final balance including advance payments
    const rawBalance = userTotalPurchases - userTotalExpense;
    const balanceWithAdvance = rawBalance + userAdvanceBalance;
    const isDue = balanceWithAdvance < 0;
    const finalAmount = Math.abs(balanceWithAdvance);

    // Generate weekly breakdown for current month (calendar weeks)
    const weeklyBreakdown = [];
    const monthStart = moment().startOf('month');
    const monthEnd = moment().endOf('month');
    
    // Define calendar weeks: 1-7, 8-14, 15-21, 22-end
    const weeks = [
      { num: 1, start: 1, end: 7 },
      { num: 2, start: 8, end: 14 },
      { num: 3, start: 15, end: 21 },
      { num: 4, start: 22, end: monthEnd.date() }
    ];
    
    weeks.forEach(({ num, start, end }) => {
      const weekStart = monthStart.clone().date(start).startOf('day');
      let weekEnd = monthStart.clone().date(Math.min(end, monthEnd.date())).endOf('day');
      
      // Ensure we don't go beyond month end
      if (weekEnd.isAfter(monthEnd)) {
        weekEnd = monthEnd.clone();
      }
      
      const weekMeals = userMeals.filter(meal => 
        moment(meal.date).isBetween(weekStart, weekEnd, null, '[]')
      );
      const weekPurchases = userPurchases.filter(purchase =>
        moment(purchase.date).isBetween(weekStart, weekEnd, null, '[]')
      );
      
      let weekExpense = 0;
      
      // Group user's week meals by date to avoid double counting
      const userMealsByDate = {};
      weekMeals.forEach(meal => {
        const dateKey = moment(meal.date).format('YYYY-MM-DD');
        if (!userMealsByDate[dateKey]) {
          userMealsByDate[dateKey] = 0;
        }
        userMealsByDate[dateKey]++;
      });
      
      // Calculate expense for each day in the week
      Object.keys(userMealsByDate).forEach(dateKey => {
        const userMealsOnDay = userMealsByDate[dateKey];
        const dayTotalMeals = totalMeals.filter(m => 
          moment(m.date).format('YYYY-MM-DD') === dateKey
        ).length;
        const dayTotalPurchases = totalPurchases
          .filter(p => moment(p.date).format('YYYY-MM-DD') === dateKey)
          .reduce((sum, p) => sum + p.amount, 0);
        
        if (dayTotalMeals > 0) {
          const dailyCostPerMeal = dayTotalPurchases / dayTotalMeals;
          weekExpense += userMealsOnDay * dailyCostPerMeal;
        }
      });
      
      const weekPurchaseTotal = weekPurchases.reduce((sum, p) => sum + p.amount, 0);
      const weekBalance = weekPurchaseTotal - weekExpense;
      
      weeklyBreakdown.push({
        week: `Week ${num}`,
        startDate: weekStart.format('MMM DD'),
        endDate: weekEnd.format('MMM DD'),
        meals: weekMeals.length,
        purchases: weekPurchaseTotal,
        expense: weekExpense,
        balance: weekBalance,
        isDue: weekBalance < 0,
        amount: Math.abs(weekBalance),
        status: weekBalance < 0 ? 'Due' : 'Credit'
      });
    });

    const dashboardData = {
      summary: {
        totalMeals: userTotalMeals,
        totalPurchases: userTotalPurchases,
        totalExpense: userTotalExpense,
        advanceBalance: userAdvanceBalance,
        balance: balanceWithAdvance,
        isDue: isDue,
        finalAmount: finalAmount,
        status: isDue ? 'Due' : 'Credit'
      },
      weeklyBreakdown: weeklyBreakdown,
      dailyBreakdown: dailyBreakdown.sort((a, b) => new Date(b.date) - new Date(a.date)),
      systemStats: {
        totalSystemMeals: systemTotalMeals,
        totalSystemPurchases: systemTotalPurchases,
        averageCostPerMeal: systemTotalMeals > 0 ? systemTotalPurchases / systemTotalMeals : 0
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get admin dashboard with all users' data
router.get('/admin', [auth, adminAuth], async (req, res) => {
  try {
    const { startDate, endDate, week, month, year } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (week) {
      // Get specific week of current month (calendar-based weeks)
      const weekNum = parseInt(week);
      
      // Use current month/year if not specified
      const targetMonth = month ? parseInt(month) - 1 : moment().month(); // moment months are 0-based
      const targetYear = year ? parseInt(year) : moment().year();
      
      const monthStart = moment().year(targetYear).month(targetMonth).date(1).startOf('day');
      const monthEnd = moment().year(targetYear).month(targetMonth).endOf('month').endOf('day');
      
      let start, end;
      
      if (weekNum === 1) {
        // Week 1: 1st to 7th
        start = monthStart.clone().date(1);
        end = monthStart.clone().date(7).endOf('day');
      } else if (weekNum === 2) {
        // Week 2: 8th to 14th  
        start = monthStart.clone().date(8);
        end = monthStart.clone().date(14).endOf('day');
      } else if (weekNum === 3) {
        // Week 3: 15th to 21st
        start = monthStart.clone().date(15);
        end = monthStart.clone().date(21).endOf('day');
      } else if (weekNum === 4) {
        // Week 4: 22nd to end of month
        start = monthStart.clone().date(22);
        end = monthEnd.clone();
      } else {
        // Invalid week number, default to current week
        const now = moment();
        start = now.clone().startOf('week');
        end = now.clone().endOf('week');
      }
      
      // Ensure we don't go beyond the month boundaries
      if (end.isAfter(monthEnd)) {
        end = monthEnd.clone();
      }
      
      dateFilter = { $gte: start.toDate(), $lte: end.toDate() };
    } else {
      // Default to current week
      const start = moment().startOf('week').toDate();
      const end = moment().endOf('week').toDate();
      dateFilter = { $gte: start, $lte: end };
    }

    // Get all users, meals, and purchases
    const [users, allMeals, allPurchases] = await Promise.all([
      User.find({}).select('name email role advanceBalance'),
      Meal.find({ date: dateFilter }).populate('user', 'name email'),
      Purchase.find({ date: dateFilter }).populate('user', 'name email')
    ]);

    // Calculate per-user breakdown
    const userBreakdown = [];
    
    for (const user of users) {
      const userMeals = allMeals.filter(meal => meal.user._id.toString() === user._id.toString());
      const userPurchases = allPurchases.filter(purchase => purchase.user._id.toString() === user._id.toString());
      
      const totalMeals = userMeals.length;
      const totalPurchases = userPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
      
      // Calculate user's share of expenses
      let userTotalExpense = 0;
      const dailyMealCounts = {};
      const dailyPurchaseTotals = {};
      
      // Group by date
      allMeals.forEach(meal => {
        const dateKey = moment(meal.date).format('YYYY-MM-DD');
        if (!dailyMealCounts[dateKey]) {
          dailyMealCounts[dateKey] = 0;
        }
        dailyMealCounts[dateKey]++;
      });
      
      allPurchases.forEach(purchase => {
        const dateKey = moment(purchase.date).format('YYYY-MM-DD');
        if (!dailyPurchaseTotals[dateKey]) {
          dailyPurchaseTotals[dateKey] = 0;
        }
        dailyPurchaseTotals[dateKey] += purchase.amount;
      });
      
      // Calculate user's daily expenses
      // Group user meals by date to avoid double counting
      const userMealsByDate = {};
      userMeals.forEach(meal => {
        const dateKey = moment(meal.date).format('YYYY-MM-DD');
        if (!userMealsByDate[dateKey]) {
          userMealsByDate[dateKey] = 0;
        }
        userMealsByDate[dateKey]++;
      });
      
      // Calculate total expense for all days
      Object.keys(userMealsByDate).forEach(dateKey => {
        const userMealsOnDay = userMealsByDate[dateKey];
        const dayTotalMeals = dailyMealCounts[dateKey] || 1;
        const dayTotalPurchases = dailyPurchaseTotals[dateKey] || 0;
        const costPerMeal = dayTotalPurchases / dayTotalMeals;
        userTotalExpense += userMealsOnDay * costPerMeal;
      });
      
      const rawBalance = totalPurchases - userTotalExpense;
      const advanceBalance = user.advanceBalance || 0;
      const finalBalance = rawBalance + advanceBalance;
      
      userBreakdown.push({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        totalMeals,
        totalPurchases,
        totalExpense: userTotalExpense,
        advanceBalance,
        rawBalance,
        balance: finalBalance,
        isDue: finalBalance < 0,
        finalAmount: Math.abs(finalBalance),
        status: finalBalance < 0 ? 'Due' : 'Credit'
      });
    }

    // System totals
    const systemTotalMeals = allMeals.length;
    const systemTotalPurchases = allPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const totalDue = userBreakdown.filter(u => u.isDue).reduce((sum, u) => sum + u.finalAmount, 0);
    const totalRefund = userBreakdown.filter(u => !u.isDue).reduce((sum, u) => sum + u.finalAmount, 0);

    const adminDashboard = {
      systemStats: {
        totalUsers: users.length,
        totalMeals: systemTotalMeals,
        totalPurchases: systemTotalPurchases,
        averageCostPerMeal: systemTotalMeals > 0 ? systemTotalPurchases / systemTotalMeals : 0,
        totalDue,
        totalRefund,
        netBalance: totalRefund - totalDue
      },
      userBreakdown: userBreakdown.sort((a, b) => b.balance - a.balance),
      dateRange: {
        start: Object.keys(dateFilter).length > 0 ? dateFilter.$gte : null,
        end: Object.keys(dateFilter).length > 0 ? dateFilter.$lte : null
      }
    };

    res.json(adminDashboard);
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
    
    // Get user's advance balance
    const user = await User.findById(req.user._id);
    const advanceBalance = user.advanceBalance || 0;
    
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

module.exports = router;