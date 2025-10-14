const moment = require('moment');
const User = require('../models/User');
const Meal = require('../models/Meal');
const Purchase = require('../models/Purchase');
const WeeklyBalance = require('../models/WeeklyBalance');
const AdvancePayment = require('../models/AdvancePayment');

class WeeklyCalculationService {
  
  /**
   * Get week boundaries for a given date
   */
  static getWeekBoundaries(date, includeWeek5 = true) {
    const momentDate = moment(date);
    const year = momentDate.year();
    const month = momentDate.month(); // 0-based
    
    const monthStart = moment().year(year).month(month).date(1);
    const monthEnd = moment().year(year).month(month).endOf('month');
    
    const weeks = [
      { num: 1, start: 1, end: 7 },
      { num: 2, start: 8, end: 14 },
      { num: 3, start: 15, end: 21 },
      { num: 4, start: 22, end: 28 }
    ];
    
    // Add Week 5 if month has more than 28 days
    if (includeWeek5 && monthEnd.date() > 28) {
      weeks.push({ num: 5, start: 29, end: monthEnd.date() });
    }
    
    return weeks.map(({ num, start, end }) => {
      const weekStart = monthStart.clone().date(start).startOf('day');
      let weekEnd = monthStart.clone().date(Math.min(end, monthEnd.date())).endOf('day');
      
      if (weekEnd.isAfter(monthEnd)) {
        weekEnd = monthEnd.clone();
      }
      
      return {
        week: num,
        year,
        month: month + 1, // Convert to 1-based
        weekStart: weekStart.toDate(),
        weekEnd: weekEnd.toDate(),
        startDate: weekStart.date(),
        endDate: weekEnd.date()
      };
    });
  }
  
  /**
   * Get all weeks from first data to current date
   */
  static async getAllWeeksInSystem() {
    try {
      // Find the earliest date in meals and purchases
      const [earliestMeal, earliestPurchase] = await Promise.all([
        Meal.findOne().sort({ date: 1 }).select('date'),
        Purchase.findOne().sort({ date: 1 }).select('date')
      ]);
      
      if (!earliestMeal && !earliestPurchase) {
        return [];
      }
      
      const earliestDate = moment.min(
        earliestMeal ? moment(earliestMeal.date) : moment(),
        earliestPurchase ? moment(earliestPurchase.date) : moment()
      );
      
      const currentDate = moment();
      const weeks = [];
      
      let currentMonth = earliestDate.clone().startOf('month');
      
      while (currentMonth.isSameOrBefore(currentDate, 'month')) {
        const monthWeeks = this.getWeekBoundaries(currentMonth.toDate());
        weeks.push(...monthWeeks);
        currentMonth.add(1, 'month');
      }
      
      return weeks.sort((a, b) => moment(a.weekStart).diff(moment(b.weekStart)));
    } catch (error) {
      console.error('Error getting all weeks in system:', error);
      return [];
    }
  }
  
  /**
   * Calculate weekly balance for a specific user and week
   */
  static async calculateWeeklyBalance(userId, weekInfo) {
    try {
      const { year, month, week, weekStart, weekEnd } = weekInfo;
      
      // Get user's meals, purchases, and advance payments for this week
      const [userMeals, userPurchases, allMeals, allPurchases, userAdvancePayments] = await Promise.all([
        Meal.find({ 
          user: userId, 
          date: { $gte: weekStart, $lte: weekEnd } 
        }),
        Purchase.find({ 
          user: userId, 
          date: { $gte: weekStart, $lte: weekEnd } 
        }),
        Meal.find({ 
          date: { $gte: weekStart, $lte: weekEnd } 
        }),
        Purchase.find({ 
          date: { $gte: weekStart, $lte: weekEnd } 
        }),
        AdvancePayment.find({ 
          user: userId, 
          date: { $gte: weekStart, $lte: weekEnd } 
        })
      ]);
      
      // Calculate daily expenses
      const dailyMealCounts = {};
      const dailyPurchaseTotals = {};
      
      // Group all meals and purchases by date
      allMeals.forEach(meal => {
        const dateKey = moment(meal.date).format('YYYY-MM-DD');
        dailyMealCounts[dateKey] = (dailyMealCounts[dateKey] || 0) + 1;
      });
      
      allPurchases.forEach(purchase => {
        const dateKey = moment(purchase.date).format('YYYY-MM-DD');
        dailyPurchaseTotals[dateKey] = (dailyPurchaseTotals[dateKey] || 0) + purchase.amount;
      });
      
      // Calculate user's total expense for the week
      let userTotalExpense = 0;
      const userMealsByDate = {};
      
      userMeals.forEach(meal => {
        const dateKey = moment(meal.date).format('YYYY-MM-DD');
        userMealsByDate[dateKey] = (userMealsByDate[dateKey] || 0) + 1;
      });
      
      Object.keys(userMealsByDate).forEach(dateKey => {
        const userMealsOnDay = userMealsByDate[dateKey];
        const dayTotalMeals = dailyMealCounts[dateKey] || 1;
        const dayTotalPurchases = dailyPurchaseTotals[dateKey] || 0;
        
        if (dayTotalMeals > 0) {
          const costPerMeal = dayTotalPurchases / dayTotalMeals;
          userTotalExpense += userMealsOnDay * costPerMeal;
        }
      });
      
      // Calculate totals
      const totalMeals = userMeals.length;
      const totalPurchases = userPurchases.reduce((sum, p) => sum + p.amount, 0);
      const totalAdvancePayments = userAdvancePayments.reduce((sum, ap) => sum + ap.amount, 0);
      
      // Get advance from previous week (includes both purchase-based and advance payment based)
      const previousWeekBalance = await this.getPreviousWeekAdvance(userId, weekInfo);
      
      // Calculate weekly balance including advance payments
  // Weekly balance consumption order explanation:
  // 1. Previous week's carried advance (credit only) is available first.
  // 2. Current week purchases and advance payments add to available funds.
  // 3. Expenses subtract from the total available.
  // Formula: weeklyBalance = (previousAdvance + purchases + advancePayments) - expense.
  // Example: Week1 credit 108 -> Week2 previousAdvance=108, purchases=0, advancePayments=0, expense=152 => weeklyBalance = 108 - 152 = -44 (Due 44).
  const weeklyBalance = previousWeekBalance.advanceFromPreviousWeek + totalPurchases + totalAdvancePayments - userTotalExpense;
      const isDue = weeklyBalance < 0;
      const finalAmount = Math.abs(weeklyBalance);
      
      // Determine advance for next week (only if positive balance)
      const advanceToNextWeek = weeklyBalance > 0 ? weeklyBalance : 0;
      
      // Calculate advance generated via purchases (excluding advance payments)
      const advanceViaPurchase = totalPurchases > userTotalExpense ? (totalPurchases - userTotalExpense) : 0;
      
      // Calculate advance from advance payments (if any remain after covering expenses)
      const advanceViaPayments = totalAdvancePayments;
      
      return {
        user: userId,
        year,
        month,
        week,
        weekStart,
        weekEnd,
        totalMeals,
        totalPurchases,
        totalAdvancePayments,
        totalExpense: userTotalExpense,
        weeklyBalance,
        advanceFromPreviousWeek: previousWeekBalance.advanceFromPreviousWeek,
        advanceViaPurchase,
        advanceViaPayments,
        advanceToNextWeek,
        isDue,
        finalAmount,
        status: isDue ? 'Due' : (weeklyBalance > 0 ? 'Credit' : 'Balanced'),
        calculatedAt: new Date(),
        recalculated: true
      };
      
    } catch (error) {
      console.error('Error calculating weekly balance:', error);
      throw error;
    }
  }
  
  /**
   * Get advance from previous week
   */
  static async getPreviousWeekAdvance(userId, currentWeekInfo) {
    try {
      const { year, month, week } = currentWeekInfo;
      
      let previousWeek, previousMonth, previousYear;
      
      if (week === 1) {
        // Get last week of previous month
        if (month === 1) {
          previousYear = year - 1;
          previousMonth = 12;
        } else {
          previousYear = year;
          previousMonth = month - 1;
        }
        
        // Find the last week of previous month
        const prevMonthWeeks = this.getWeekBoundaries(
          moment().year(previousYear).month(previousMonth - 1).date(1).toDate()
        );
        const lastWeek = prevMonthWeeks[prevMonthWeeks.length - 1];
        previousWeek = lastWeek.week;
      } else {
        previousYear = year;
        previousMonth = month;
        previousWeek = week - 1;
      }
      
      const previousWeekBalance = await WeeklyBalance.findOne({
        user: userId,
        year: previousYear,
        month: previousMonth,
        week: previousWeek
      });
      
      return {
        advanceFromPreviousWeek: previousWeekBalance ? previousWeekBalance.advanceToNextWeek : 0
      };
      
    } catch (error) {
      console.error('Error getting previous week advance:', error);
      return { advanceFromPreviousWeek: 0 };
    }
  }
  
  /**
   * Recalculate weekly balances from a specific advance payment date
   */
  static async recalculateFromAdvancePaymentDate(userId, advancePaymentDate) {
    try {
      console.log(`🔄 Recalculating weekly balances for user ${userId} from ${moment(advancePaymentDate).format('YYYY-MM-DD')}`);
      
      // Find which week this advance payment falls into
      const paymentMoment = moment(advancePaymentDate);
      const year = paymentMoment.year();
      const month = paymentMoment.month(); // 0-based
      
      const monthWeeks = this.getWeekBoundaries(paymentMoment.toDate());
      const targetWeek = monthWeeks.find(week => 
        paymentMoment.isBetween(moment(week.weekStart), moment(week.weekEnd), null, '[]')
      );
      
      if (!targetWeek) {
        console.log('❌ Could not determine week for advance payment date');
        return;
      }
      
      console.log(`📅 Advance payment falls in Week ${targetWeek.week} of ${paymentMoment.format('MMMM YYYY')}`);
      
      // Get all weeks from the target week onwards
      const allWeeks = await this.getAllWeeksInSystem();
      const targetWeekStart = moment(targetWeek.weekStart);
      
      const weeksToRecalculate = allWeeks.filter(week => 
        moment(week.weekStart).isSameOrAfter(targetWeekStart)
      );
      
      console.log(`🔄 Recalculating ${weeksToRecalculate.length} weeks starting from Week ${targetWeek.week}`);
      
      // Recalculate each week from the target week onwards
      for (const weekInfo of weeksToRecalculate) {
        try {
          const weeklyBalanceData = await this.calculateWeeklyBalance(userId, weekInfo);
          
          // Save or update weekly balance
          await WeeklyBalance.findOneAndUpdate(
            {
              user: userId,
              year: weekInfo.year,
              month: weekInfo.month,
              week: weekInfo.week
            },
            weeklyBalanceData,
            { upsert: true, new: true }
          );
          
        } catch (error) {
          console.error(`❌ Error recalculating week ${weekInfo.week} of ${weekInfo.month}/${weekInfo.year}:`, error);
        }
      }
      
      console.log(`✅ Recalculation complete for user ${userId}`);
      return { success: true, weeksRecalculated: weeksToRecalculate.length };
      
    } catch (error) {
      console.error('❌ Error in advance payment recalculation:', error);
      throw error;
    }
  }

  /**
   * Recalculate all weekly balances from the beginning
   */
  static async recalculateAllWeeksFromBeginning() {
    try {
      console.log('🔄 Starting complete recalculation of all weekly balances...');
      
      // Clear existing weekly balance data
      await WeeklyBalance.deleteMany({});
      console.log('🗑️ Cleared existing weekly balance data');
      
      // Get all users
      const users = await User.find({});
      console.log(`👥 Found ${users.length} users`);
      
      // Get all weeks in the system
      const allWeeks = await this.getAllWeeksInSystem();
      console.log(`📅 Found ${allWeeks.length} weeks to process`);
      
      let processedCount = 0;
      
      // Process each week chronologically
      for (const weekInfo of allWeeks) {
        console.log(`📊 Processing Week ${weekInfo.week} of ${moment(weekInfo.weekStart).format('MMMM YYYY')}`);
        
        // Process each user for this week
        for (const user of users) {
          try {
            const weeklyBalanceData = await this.calculateWeeklyBalance(user._id, weekInfo);
            
            // Save or update weekly balance
            await WeeklyBalance.findOneAndUpdate(
              {
                user: user._id,
                year: weekInfo.year,
                month: weekInfo.month,
                week: weekInfo.week
              },
              weeklyBalanceData,
              { upsert: true, new: true }
            );
            
            processedCount++;
          } catch (error) {
            console.error(`❌ Error processing user ${user.name} for week ${weekInfo.week}:`, error);
          }
        }
      }
      
      console.log(`✅ Recalculation complete! Processed ${processedCount} weekly balance records`);
      return { success: true, processedCount };
      
    } catch (error) {
      console.error('❌ Error in complete recalculation:', error);
      throw error;
    }
  }
  
  /**
   * Get weekly breakdown for a user
   */
  static async getUserWeeklyBreakdown(userId, year, month) {
    try {
      const weeklyBalances = await WeeklyBalance.find({
        user: userId,
        year,
        month
      }).sort({ week: 1 });
      
      return weeklyBalances.map(wb => ({
        week: `Week ${wb.week}`,
        startDate: moment(wb.weekStart).format('MMM DD'),
        endDate: moment(wb.weekEnd).format('MMM DD'),
        meals: wb.totalMeals,
        purchases: wb.totalPurchases,
        advancePayments: wb.totalAdvancePayments,
        expense: wb.totalExpense,
        advanceFromPrevious: wb.advanceFromPreviousWeek,
        advanceViaPurchase: wb.advanceViaPurchase,
        advanceViaPayments: wb.advanceViaPayments,
        balance: wb.weeklyBalance,
        isDue: wb.isDue,
        amount: wb.finalAmount,
        status: wb.status
      }));
      
    } catch (error) {
      console.error('Error getting user weekly breakdown:', error);
      return [];
    }
  }
  
  /**
   * Get current user's advance balance from latest weekly calculation
   */
  static async getCurrentUserAdvanceBalance(userId) {
    try {
      // Get the latest weekly balance record for this user
      const latestWeeklyBalance = await WeeklyBalance.findOne({
        user: userId
      }).sort({ year: -1, month: -1, week: -1 });
      
      if (!latestWeeklyBalance) {
        return 0;
      }
      
      // Return the advance that would carry to next week
      return latestWeeklyBalance.advanceToNextWeek || 0;
      
    } catch (error) {
      console.error('Error getting current user advance balance:', error);
      return 0;
    }
  }

  /**
   * Get admin dashboard data with comprehensive meal tracking
   */
  static async getAdminDashboardData(year, month, week = null) {
    try {
      const query = { year, month };
      if (week) {
        query.week = week;
      }
      
      const weeklyBalances = await WeeklyBalance.find(query)
        .populate('user', 'name email role')
        .sort({ week: 1, 'user.name': 1 });
      
      // Group data for admin view
      const userStats = {};
      const weekStats = {};
      const dayStats = {};
      
      for (const wb of weeklyBalances) {
        const userId = wb.user._id.toString();
        
        // User-wise stats
        if (!userStats[userId]) {
          userStats[userId] = {
            user: wb.user,
            totalMeals: 0,
            totalPurchases: 0,
            totalAdvancePayments: 0,
            totalExpenses: 0,
            weeklyBreakdown: []
          };
        }
        
        userStats[userId].totalMeals += wb.totalMeals;
        userStats[userId].totalPurchases += wb.totalPurchases;
        userStats[userId].totalAdvancePayments += wb.totalAdvancePayments || 0;
        userStats[userId].totalExpenses += wb.totalExpense;
        userStats[userId].weeklyBreakdown.push({
          week: wb.week,
          meals: wb.totalMeals,
          purchases: wb.totalPurchases,
          advancePayments: wb.totalAdvancePayments || 0,
          expense: wb.totalExpense,
          balance: wb.weeklyBalance,
          status: wb.status
        });
        
        // Week-wise stats
        const weekKey = `${year}-${month}-${wb.week}`;
        if (!weekStats[weekKey]) {
          weekStats[weekKey] = {
            week: wb.week,
            totalUsers: 0,
            totalMeals: 0,
            totalPurchases: 0,
            totalAdvancePayments: 0,
            totalExpenses: 0
          };
        }
        
        weekStats[weekKey].totalUsers++;
        weekStats[weekKey].totalMeals += wb.totalMeals;
        weekStats[weekKey].totalPurchases += wb.totalPurchases;
        weekStats[weekKey].totalAdvancePayments += wb.totalAdvancePayments || 0;
        weekStats[weekKey].totalExpenses += wb.totalExpense;
      }
      
      return {
        userStats: Object.values(userStats),
        weekStats: Object.values(weekStats),
        summary: {
          totalUsers: Object.keys(userStats).length,
          totalMeals: Object.values(userStats).reduce((sum, u) => sum + u.totalMeals, 0),
          totalPurchases: Object.values(userStats).reduce((sum, u) => sum + u.totalPurchases, 0),
          totalAdvancePayments: Object.values(userStats).reduce((sum, u) => sum + u.totalAdvancePayments, 0),
          totalExpenses: Object.values(userStats).reduce((sum, u) => sum + u.totalExpenses, 0)
        }
      };
      
    } catch (error) {
      console.error('Error getting admin dashboard data:', error);
      throw error;
    }
  }
}

module.exports = WeeklyCalculationService;