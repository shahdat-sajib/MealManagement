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
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchSystemStats();
    fetchPaymentHistory();
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

  const fetchPaymentHistory = async () => {
    try {
      const result = await dashboardApi.getMyPayments();
      if (result.success) {
        setPaymentHistory(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
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

      {/* Summary Cards - Clear Weekly Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Meals</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalMeals || 0}</p>
              <p className="text-xs text-gray-500">This week</p>
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
              <p className="text-xs text-gray-500">Within the week</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Meal Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalExpense || 0)}</p>
              <p className="text-xs text-gray-500">This week</p>
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
              <p className="text-xs text-gray-500">Previous + Payments + Purchases</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${summary?.isDue ? 'bg-red-100' : 'bg-green-100'}`}>
              <span className="text-2xl">{summary?.isDue ? '❌' : '✅'}</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Final Calculation</p>
              <p className={`text-2xl font-bold ${summary?.isDue ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(summary?.finalAmount || 0)} {summary?.isDue ? 'Due' : 'Credit'}
              </p>
              <p className="text-xs text-gray-500">Advance Balance - Meal Cost</p>
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
                  Meals Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advance Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meal Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous Advance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advance Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Calculation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carry Forward
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
                      {week.meals || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(week.purchases || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatCurrency(week.advancePayments || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(week.expense || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {formatCurrency(week.advanceFromPrevious || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {formatCurrency((week.advanceFromPrevious || 0) + (week.advancePayments || 0) + (week.purchases || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={week.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(week.amount || Math.abs(week.balance || 0))} {week.balance >= 0 ? 'Credit' : 'Due'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(week.balance > 0 ? (week.amount || Math.abs(week.balance)) : 0)}
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

      {/* Payment History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Payment History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentHistory.length > 0 ? (
                paymentHistory.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateForDisplay(payment.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.paymentType === 'due_clearance' 
                          ? 'bg-blue-100 text-blue-800' 
                          : payment.paymentType === 'deduction'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {payment.paymentType === 'due_clearance' ? '💰 Due Cleared' : 
                         payment.paymentType === 'deduction' ? '❌ Deduction' : 
                         '💳 Advance Payment'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={payment.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(Math.abs(payment.amount))}
                        {payment.paymentType === 'due_clearance' && payment.clearedDueAmount > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            (cleared ${payment.clearedDueAmount.toFixed(2)} due)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.notes || 'No notes'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.addedBy}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No payment history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;