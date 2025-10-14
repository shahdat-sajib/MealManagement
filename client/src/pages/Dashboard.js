import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDateForDisplay, getWeekDateRange, getCurrentMonthYear, getMonthOptions, getFilterDescription } from '../utils/helpers';
import PaymentReceiptHistory from '../components/PaymentReceiptHistory';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('current-week');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());

  useEffect(() => {
    fetchDashboardData();
    fetchHistoryData();
  }, [dateRange, selectedMonth]);

  const fetchDashboardData = async () => {
    const params = getDateParams();
    const result = await dashboardApi.getDashboard(params);
    
    if (result.success) {
      setDashboardData(result.data);
    } else {
      toast.error('Failed to fetch dashboard data');
    }
  };

  const fetchHistoryData = async () => {
    const result = await dashboardApi.getHistory({ months: 6 });
    
    if (result.success) {
      setHistoryData(result.data.history);
    }
    setLoading(false);
  };

  const getDateParams = () => {
    const params = {};
    
    switch (dateRange) {
      case 'current-week': {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        params.startDate = startOfWeek.toISOString().split('T')[0];
        params.endDate = endOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'week-1':
      case 'week-2':
      case 'week-3':
      case 'week-4': {
        const weekNum = parseInt(dateRange.split('-')[1]);
        params.week = weekNum;
        params.month = selectedMonth.month;
        params.year = selectedMonth.year;
        break;
      }
      case 'current-month': {
        const monthStart = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
        const monthEnd = new Date(selectedMonth.year, selectedMonth.month, 0);
        params.startDate = monthStart.toISOString().split('T')[0];
        params.endDate = monthEnd.toISOString().split('T')[0];
        break;
      }
      default: {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        params.startDate = startOfWeek.toISOString().split('T')[0];
        params.endDate = endOfWeek.toISOString().split('T')[0];
      }
    }
    
    return params;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { summary, weeklyBreakdown = [], dailyBreakdown = [], systemStats } = dashboardData || {};

  const pieData = [
    { name: 'Expenses', value: summary?.totalExpense || 0, color: '#EF4444' },
    { name: 'Purchases', value: summary?.totalPurchases || 0, color: '#3B82F6' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your meal expenses and balance</p>
          <p className="text-sm text-blue-600 font-medium mt-1">
            Showing: {getFilterDescription(dateRange, selectedMonth)}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Month/Year Selection for Week Filters */}
          {['week-1', 'week-2', 'week-3', 'week-4', 'current-month'].includes(dateRange) && (
            <select
              value={`${selectedMonth.year}-${selectedMonth.month.toString().padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                setSelectedMonth({
                  month: parseInt(month),
                  year: parseInt(year),
                  display: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
                });
              }}
              className="input max-w-xs"
            >
              {getMonthOptions().map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          
          {/* Date Range Selection */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input max-w-xs"
          >
            <option value="current-week">Current Week</option>
            <option value="week-1">Week 1 (1st - 7th)</option>
            <option value="week-2">Week 2 (8th - 14th)</option>
            <option value="week-3">Week 3 (15th - 21st)</option>
            <option value="week-4">Week 4 (22nd - End of Month)</option>
            <option value="current-month">Full Month</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Meals</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalMeals || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalPurchases || 0)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalExpense || 0)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Advance Balance</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(summary?.advanceBalance || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${summary?.isDue ? 'bg-red-100' : 'bg-green-100'}`}>
              <span className="text-2xl">{summary?.isDue ? '⚠️' : '✅'}</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{summary?.status || 'Balance'}</p>
              <p className={`text-2xl font-bold ${summary?.isDue ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(summary?.finalAmount || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense History Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense History (6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line 
                type="monotone" 
                dataKey="purchases" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Purchases"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Breakdown (Current Month)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weeklyBreakdown && weeklyBreakdown.length > 0 ? (
                weeklyBreakdown.map((week, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {week.week}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {week.startDate} - {week.endDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {week.meals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(week.purchases)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(week.expense)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={week.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(week.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        week.isDue 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {week.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No weekly data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Your Meals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Meals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Purchases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Per Meal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Your Expense
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailyBreakdown.length > 0 ? (
                dailyBreakdown.map((day, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateForDisplay(day.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.userMeals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.totalMeals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(day.totalPurchases)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(day.costPerMeal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(day.userExpense)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Stats */}
      {systemStats && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{systemStats.totalSystemMeals}</p>
              <p className="text-sm text-gray-600">Total System Meals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">{formatCurrency(systemStats.totalSystemPurchases)}</p>
              <p className="text-sm text-gray-600">Total System Purchases</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(systemStats.averageCostPerMeal)}</p>
              <p className="text-sm text-gray-600">Average Cost Per Meal</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt History */}
      <PaymentReceiptHistory />
    </div>
  );
};

export default Dashboard;