import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDateForDisplay, generateColors } from '../utils/helpers';
import AdvancePaymentManager from '../components/AdvancePaymentManager';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('current-week');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchAdminData();
  }, [dateRange]);

  const fetchAdminData = async () => {
    const params = getDateParams();
    const result = await dashboardApi.getAdminDashboard(params);
    
    if (result.success) {
      setAdminData(result.data);
    } else {
      toast.error('Failed to fetch admin dashboard data');
    }
    setLoading(false);
  };

  const getDateParams = () => {
    const now = new Date();
    const params = {};
    
    switch (dateRange) {
      case 'current-week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        params.startDate = startOfWeek.toISOString().split('T')[0];
        params.endDate = endOfWeek.toISOString().split('T')[0];
        break;
      case 'week-1':
        params.week = 1;
        break;
      case 'week-2':
        params.week = 2;
        break;
      case 'week-3':
        params.week = 3;
        break;
      case 'week-4':
        params.week = 4;
        break;
      case 'current-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        params.startDate = monthStart.toISOString().split('T')[0];
        params.endDate = monthEnd.toISOString().split('T')[0];
        break;
      default:
        const defaultStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const defaultEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        params.startDate = defaultStart.toISOString().split('T')[0];
        params.endDate = defaultEnd.toISOString().split('T')[0];
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

  const { systemStats, userBreakdown = [] } = adminData || {};

  // Prepare chart data
  const balanceData = userBreakdown.map(user => ({
    name: user.user.name,
    balance: user.balance,
    purchases: user.totalPurchases,
    expenses: user.totalExpense
  }));

  const statusData = [
    {
      name: 'Due',
      value: userBreakdown.filter(u => u.isDue).length,
      color: '#EF4444'
    },
    {
      name: 'Refund',
      value: userBreakdown.filter(u => !u.isDue).length,
      color: '#10B981'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and user management</p>
        </div>
        
        {activeTab === 'dashboard' && (
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input max-w-xs"
          >
            <option value="current-week">Current Week</option>
            <option value="week-1">Week 1 of Month</option>
            <option value="week-2">Week 2 of Month</option>
            <option value="week-3">Week 3 of Month</option>
            <option value="week-4">Week 4 of Month</option>
            <option value="current-month">Current Month</option>
          </select>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💰 Advance Payments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'payments' ? (
        <AdvancePaymentManager />
      ) : (
        <div className="space-y-6">
          {/* Dashboard Content */}

      {/* System Stats Cards */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <span className="text-2xl">🍽️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Meals</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats.totalMeals}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(systemStats.totalPurchases)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Cost/Meal</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(systemStats.averageCostPerMeal)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-red-50 border-red-200">
            <div className="text-center">
              <p className="text-sm font-medium text-red-600">Total Due</p>
              <p className="text-3xl font-bold text-red-700">{formatCurrency(systemStats.totalDue)}</p>
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="text-center">
              <p className="text-sm font-medium text-green-600">Total Refund</p>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(systemStats.totalRefund)}</p>
            </div>
          </div>

          <div className="card bg-blue-50 border-blue-200">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-600">Net Balance</p>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(systemStats.netBalance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Balance Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Balances</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={balanceData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="balance" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Breakdown Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">User Breakdown</h3>
          <div className="text-sm text-gray-600">
            {userBreakdown.length} users
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
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
                  Advance Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userBreakdown.map((user, index) => (
                <tr key={user.user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">
                          {user.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.user.name}</div>
                        <div className="text-sm text-gray-500">{user.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.totalMeals}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(user.totalPurchases)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(user.totalExpense)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-purple-600">
                      {formatCurrency(user.advanceBalance || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={user.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(Math.abs(user.balance))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isDue 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-gray-900">Export Data</div>
            <div className="text-sm text-gray-600">Download system reports</div>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-gray-900">Manage Users</div>
            <div className="text-sm text-gray-600">Add or remove users</div>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-medium text-gray-900">System Settings</div>
            <div className="text-sm text-gray-600">Configure application</div>
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">ℹ️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Admin Features</h4>
              <p className="text-sm text-blue-700 mt-1">
                Additional admin features like user management and system settings are planned for future releases.
              </p>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;