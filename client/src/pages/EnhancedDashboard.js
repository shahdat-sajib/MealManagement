import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { dashboardApi, calculationApi } from '../services/api';
import { formatCurrency, formatDateForDisplay, getCurrentMonthYear, getMonthOptions } from '../utils/helpers';
import toast from 'react-hot-toast';

const EnhancedDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [systemStats, setSystemStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSystemStats();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    const params = {
      year: selectedMonth.year,
      month: selectedMonth.month
    };
    
    const result = await dashboardApi.getWeeklyDashboard(params);
    
    if (result.success) {
      setDashboardData(result.data);
    } else {
      toast.error('Failed to fetch dashboard data');
    }
    setLoading(false);
  };

  const fetchSystemStats = async () => {
    const result = await calculationApi.getSystemStats();
    if (result.success) {
      setSystemStats(result.data);
    }
  };

  const handleRecalculate = async () => {
    if (!window.confirm('This will recalculate all weekly balances from the beginning. This may take a few minutes. Continue?')) {
      return;
    }

    setLoading(true);
    toast.loading('Recalculating all weekly balances...');

    try {
      const result = await calculationApi.recalculateAll();
      if (result.success) {
        toast.dismiss();
        toast.success(`Recalculation complete! Processed ${result.data.processedCount} records`);
        fetchDashboardData();
        fetchSystemStats();
      } else {
        toast.dismiss();
        toast.error('Failed to recalculate data');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Error during recalculation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { summary, weeklyBreakdown = [], systemStats: dashSystemStats } = dashboardData || {};

  // Prepare chart data
  const chartData = weeklyBreakdown.map(week => ({
    name: week.week,
    purchases: week.purchases,
    expenses: week.expense,
    balance: week.balance,
    meals: week.meals
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Dashboard</h1>
          <p className="text-gray-600">Weekly reset system with purchase-based advances</p>
          <p className="text-sm text-blue-600 font-medium mt-1">
            Showing: {summary?.monthYear || 'Current Month'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Month Selection */}
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

          {/* Recalculate Button */}
          <button
            onClick={handleRecalculate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Recalculate All
          </button>
        </div>
      </div>

      {/* System Status */}
      {systemStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">System Status</h3>
              <p className="text-blue-700">
                {systemStats.systemStatus} • {systemStats.totalWeeklyRecords} weekly records • {systemStats.totalUsers} users
              </p>
              {systemStats.lastCalculationDate && (
                <p className="text-sm text-blue-600">
                  Last calculation: {formatDateForDisplay(systemStats.lastCalculationDate)}
                </p>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemStats.systemStatus === 'Calculated' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {systemStats.systemStatus}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Advance Payments</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.totalAdvancePayments || 0)}</p>
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
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">⬆️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Advance Generated</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary?.totalAdvanceGenerated || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">⬇️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Advance Used</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary?.totalAdvanceReceived || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Balance Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Balance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Weekly Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Purchases vs Expenses */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchases vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="purchases" fill="#10B981" name="Purchases" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Breakdown Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Breakdown - {summary?.monthYear}</h3>
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
                  Advance Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advance From Previous
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advance Via Purchase
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weekly Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weeklyBreakdown.length > 0 ? (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatCurrency(week.advancePayments || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(week.expense)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {formatCurrency(week.advanceFromPrevious || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(week.advanceViaPurchase || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={week.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(Math.abs(week.balance))} {week.balance >= 0 ? 'Cr' : 'Due'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        week.isDue 
                          ? 'bg-red-100 text-red-800' 
                          : week.balance > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {week.balance > 0 ? 'Credit' : (week.isDue ? 'Due' : 'Balanced')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No weekly data available. Click "Recalculate All" to process data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Calculation System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📊 Weekly Reset System</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Each week starts with 0 balance</li>
              <li>• Week 1: Days 1-7, Week 2: Days 8-14</li>
              <li>• Week 3: Days 15-21, Week 4: Days 22-28</li>
              <li>• Week 5: Days 29-31 (if applicable)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">💰 Advanced Payment System</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Excess purchases become advances</li>
              <li>• Advance payments included in weekly balance</li>
              <li>• Credit advances carry to next week</li>
              <li>• Due balances don't carry forward</li>
              <li>• Historical data recalculated from beginning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;