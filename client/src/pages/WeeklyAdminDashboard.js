import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import { formatCurrency, getCurrentMonthYear, getMonthOptions } from '../utils/helpers';
import toast from 'react-hot-toast';

const WeeklyAdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    fetchAdminData();
  }, [selectedMonth, selectedWeek]);

  const fetchAdminData = async () => {
    try {
      const params = {
        year: selectedMonth.year,
        month: selectedMonth.month,
        week: selectedWeek
      };
      
      const result = await dashboardApi.getAdminDashboard(params);
      
      if (result.success) {
        setAdminData(result.data);
      } else {
        toast.error('Failed to fetch admin dashboard data');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error fetching admin dashboard data');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { weeklyTotals, userBreakdown = [] } = adminData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Admin Dashboard</h1>
          <p className="text-gray-600">User breakdown and weekly totals</p>
          <p className="text-sm text-blue-600 font-medium mt-1">
            {weeklyTotals?.week} • {weeklyTotals?.weekRange} • {weeklyTotals?.monthYear}
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

          {/* Week Selection */}
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="input max-w-xs"
          >
            <option value={1}>Week 1 (1-7)</option>
            <option value={2}>Week 2 (8-14)</option>
            <option value={3}>Week 3 (15-21)</option>
            <option value={4}>Week 4 (22-28)</option>
            <option value={5}>Week 5 (29-31)</option>
          </select>
        </div>
      </div>

      {/* Weekly Totals Summary */}
      {weeklyTotals && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Totals Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Total Users</p>
              <p className="text-2xl font-bold text-blue-900">{weeklyTotals.totalUsers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Total Meals</p>
              <p className="text-2xl font-bold text-gray-900">{weeklyTotals.totalMeals}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Total Purchases</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(weeklyTotals.totalPurchases)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Advance Payments</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(weeklyTotals.totalAdvancePayments)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-600">Total Meal Cost</p>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(weeklyTotals.totalExpense)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-600">Total Advance Balance</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(weeklyTotals.totalAdvanceBalance)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Total Credit</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(weeklyTotals.totalCredit)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-600">Total Due</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(weeklyTotals.totalDue)}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-orange-600">Total Carry Forward</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(weeklyTotals.totalCarryForward)}</p>
            </div>
            <div className={`p-4 rounded-lg ${weeklyTotals.netBalance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm font-medium ${weeklyTotals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Balance</p>
              <p className={`text-2xl font-bold ${weeklyTotals.netBalance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(weeklyTotals.netBalance))} {weeklyTotals.netBalance >= 0 ? 'Credit' : 'Due'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Breakdown Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Weekly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
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
              {userBreakdown.length > 0 ? (
                userBreakdown.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{user.user.name}</div>
                        <div className="text-sm text-gray-500 ml-2">({user.user.role})</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.totalMeals || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(user.totalPurchases || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatCurrency(user.totalAdvancePayments || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(user.totalExpense || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {formatCurrency(user.previousAdvance || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {formatCurrency(user.advanceBalance || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={(user.finalCalculation || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(user.finalAmount || 0)} {(user.finalCalculation || 0) >= 0 ? 'Credit' : 'Due'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(user.carryForwardAdvance || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No user data available for this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Reset Calculation System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📊 Weekly Reset Logic</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Each week starts fresh (meal count, meal cost = 0)</li>
              <li>• Week 1: Days 1-7, Week 2: Days 8-14</li>
              <li>• Week 3: Days 15-21, Week 4: Days 22-28</li>
              <li>• Week 5: Days 29-31 (if applicable)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">💰 Advance Balance Formula</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Advance Balance = Previous + Payments + Purchases</li>
              <li>• Final Calculation = Advance Balance - Meal Cost</li>
              <li>• If positive = Credit (carry forward to next week)</li>
              <li>• If negative = Due (no carry forward)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAdminDashboard;