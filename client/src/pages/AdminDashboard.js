import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi, mealsApi, purchasesApi } from '../services/api';
import { formatCurrency, formatDateForDisplay, formatDateForAPI, generateColors } from '../utils/helpers';
import AdvancePaymentManager from '../components/AdvancePaymentManager';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('current-week');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Date-wise reports state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportLoading, setReportLoading] = useState(false);
  const [mealReports, setMealReports] = useState([]);
  const [purchaseReports, setPurchaseReports] = useState([]);
  const [reportStats, setReportStats] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'meal-reports' || activeTab === 'purchase-reports') {
      fetchDateWiseReports();
    }
  }, [selectedDate, activeTab]);

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

  const fetchDateWiseReports = async () => {
    setReportLoading(true);
    try {
      const dateStr = formatDateForAPI(selectedDate);
      console.log('🗓️ Date Selection Debug:', {
        originalDate: selectedDate,
        formattedForAPI: dateStr,
        selectedDateString: selectedDate.toString(),
        getDate: selectedDate.getDate(),
        getMonth: selectedDate.getMonth() + 1,
        getFullYear: selectedDate.getFullYear()
      });
      
      if (activeTab === 'meal-reports') {
        const result = await getUsersWithMeals(dateStr);
        setMealReports(result.users || []);
        setReportStats(result.stats || null);
      } else if (activeTab === 'purchase-reports') {
        const result = await getUsersWithPurchases(dateStr);
        setPurchaseReports(result.users || []);
        setReportStats(result.stats || null);
      }
    } catch (error) {
      console.error('Error fetching date-wise reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setReportLoading(false);
    }
  };

  const getUsersWithMeals = async (date) => {
    try {
      // Fetch all users
      const usersResponse = await dashboardApi.getAdminDashboard({ startDate: date, endDate: date });
      const allUsers = usersResponse.data?.userBreakdown || [];
      
      // Fetch meals for the specific date
      const mealsResponse = await mealsApi.getAllMeals({ startDate: date, endDate: date });
      console.log('Meals API Response:', mealsResponse);
      
      // Handle different response structures
      let mealsData = [];
      if (mealsResponse.success && mealsResponse.data) {
        // The API returns { meals: [...] }
        if (Array.isArray(mealsResponse.data.meals)) {
          mealsData = mealsResponse.data.meals;
        } else if (Array.isArray(mealsResponse.data)) {
          mealsData = mealsResponse.data;
        }
      }
      
      console.log('Processed meals data:', mealsData);
      
      // Create a map of users who ordered meals
      const usersWithMeals = new Map();
      if (Array.isArray(mealsData)) {
        mealsData.forEach(meal => {
          if (meal.user) {
            usersWithMeals.set(meal.user._id, {
              ...meal.user,
              meals: [...(usersWithMeals.get(meal.user._id)?.meals || []), meal]
            });
          }
        });
      }
      
      // Get total purchases for the same date to calculate meal costs
      const purchasesForDate = await purchasesApi.getAllPurchases({ startDate: date, endDate: date });
      const totalPurchasesAmount = purchasesForDate.success && purchasesForDate.data?.purchases 
        ? purchasesForDate.data.purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0)
        : 0;
      
      // Calculate cost per meal if there are meals
      const totalMealsCount = Array.isArray(mealsData) ? mealsData.length : 0;
      const costPerMeal = totalMealsCount > 0 ? totalPurchasesAmount / totalMealsCount : 0;
      
      // Prepare final data
      const users = allUsers.map(userBreakdown => {
        const userMeals = usersWithMeals.get(userBreakdown.user.id);
        const userMealsCount = userMeals?.meals.length || 0;
        const userMealCost = userMealsCount * costPerMeal;
        
        return {
          ...userBreakdown.user,
          hasOrdered: !!userMeals,
          meals: userMeals?.meals || [],
          totalAmount: userMealCost, // Cost based on meals * cost per meal
          mealsCount: userMealsCount
        };
      });
      
      const stats = {
        totalUsers: users.length,
        usersWithOrders: users.filter(u => u.hasOrdered).length,
        usersWithoutOrders: users.filter(u => !u.hasOrdered).length,
        totalOrders: totalMealsCount,
        totalAmount: totalPurchasesAmount, // Total purchases for the day
        costPerMeal: costPerMeal
      };
      
      return { users, stats };
    } catch (error) {
      console.error('Error fetching users with meals:', error);
      throw error;
    }
  };

  const getUsersWithPurchases = async (date) => {
    try {
      // Fetch all users
      const usersResponse = await dashboardApi.getAdminDashboard({ startDate: date, endDate: date });
      const allUsers = usersResponse.data?.userBreakdown || [];
      
      // Fetch purchases for the specific date
      const purchasesResponse = await purchasesApi.getAllPurchases({ startDate: date, endDate: date });
      console.log('Purchases API Response:', purchasesResponse);
      
      // Handle different response structures
      let purchasesData = [];
      if (purchasesResponse.success && purchasesResponse.data) {
        // The API returns { purchases: [...] }
        if (Array.isArray(purchasesResponse.data.purchases)) {
          purchasesData = purchasesResponse.data.purchases;
        } else if (Array.isArray(purchasesResponse.data)) {
          purchasesData = purchasesResponse.data;
        }
      }
      
      console.log('Processed purchases data:', purchasesData);
      
      // Create a map of users who made purchases
      const usersWithPurchases = new Map();
      if (Array.isArray(purchasesData)) {
        purchasesData.forEach(purchase => {
          if (purchase.user) {
            usersWithPurchases.set(purchase.user._id, {
              ...purchase.user,
              purchases: [...(usersWithPurchases.get(purchase.user._id)?.purchases || []), purchase]
            });
          }
        });
      }
      
      // Prepare final data
      const users = allUsers.map(userBreakdown => {
        const userPurchases = usersWithPurchases.get(userBreakdown.user.id);
        return {
          ...userBreakdown.user,
          hasPurchased: !!userPurchases,
          purchases: userPurchases?.purchases || [],
          totalAmount: userPurchases?.purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0) || 0
        };
      });
      
      const stats = {
        totalUsers: users.length,
        usersWithPurchases: users.filter(u => u.hasPurchased).length,
        usersWithoutPurchases: users.filter(u => !u.hasPurchased).length,
        totalPurchases: Array.isArray(purchasesData) ? purchasesData.length : 0,
        totalAmount: users.reduce((sum, user) => sum + user.totalAmount, 0)
      };
      
      return { users, stats };
    } catch (error) {
      console.error('Error fetching users with purchases:', error);
      throw error;
    }
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
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💰 Advance Payments
          </button>
          <button
            onClick={() => setActiveTab('meal-reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'meal-reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🍽️ Meal Reports
          </button>
          <button
            onClick={() => setActiveTab('purchase-reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'purchase-reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🛒 Purchase Reports
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'payments' ? (
        <AdvancePaymentManager />
      ) : activeTab === 'meal-reports' ? (
        <div className="space-y-6">
          {/* Meal Reports Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Date Selection */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Select Date</h3>
              <Calendar
                onChange={(date) => {
                  console.log('📅 Meal Calendar onChange:', {
                    selected: date,
                    dateString: date.toString(),
                    getDate: date.getDate(),
                    getMonth: date.getMonth() + 1,
                    getFullYear: date.getFullYear()
                  });
                  setSelectedDate(date);
                }}
                value={selectedDate}
                className="w-full border-none"
                tileClassName="hover:bg-blue-100 rounded"
                locale="en-US"
                calendarType="gregory"
              />
            </div>

            {/* Statistics */}
            <div className="lg:col-span-2">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📊 Meal Statistics for {formatDateForDisplay(selectedDate)}
                </h3>
                
                {reportLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : reportStats ? (
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{reportStats.totalUsers}</div>
                      <div className="text-sm text-blue-800">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{reportStats.usersWithOrders}</div>
                      <div className="text-sm text-green-800">Ordered</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{reportStats.usersWithoutOrders}</div>
                      <div className="text-sm text-red-800">Not Ordered</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{reportStats.totalOrders}</div>
                      <div className="text-sm text-yellow-800">Total Meals</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(reportStats.totalAmount)}</div>
                      <div className="text-sm text-purple-800">Total Purchases</div>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">
                        {reportStats.costPerMeal > 0 ? formatCurrency(reportStats.costPerMeal) : '$0.00'}
                      </div>
                      <div className="text-sm text-indigo-800">Cost Per Meal</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No data available for selected date
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Details Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              👥 User Meal Orders for {formatDateForDisplay(selectedDate)}
            </h3>
            
            {reportLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mealReports.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 ${!user.hasOrdered ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-sm font-bold">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.hasOrdered 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.hasOrdered ? '✅ Ordered' : '❌ Not Ordered'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.mealsCount || user.meals.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(user.totalAmount)}
                          {user.hasOrdered && reportStats?.costPerMeal > 0 && (
                            <div className="text-xs text-gray-500">
                              {user.mealsCount || user.meals.length} × {formatCurrency(reportStats.costPerMeal)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.hasOrdered ? (
                            <div className="max-w-xs">
                              {user.meals.map((meal, idx) => (
                                <div key={idx} className="text-xs mb-1">
                                  {meal.description} ({meal.mealType || 'meal'})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No orders</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'purchase-reports' ? (
        <div className="space-y-6">
          {/* Purchase Reports Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Date Selection */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Select Date</h3>
              <Calendar
                onChange={(date) => {
                  console.log('📅 Purchase Calendar onChange:', {
                    selected: date,
                    dateString: date.toString(),
                    getDate: date.getDate(),
                    getMonth: date.getMonth() + 1,
                    getFullYear: date.getFullYear()
                  });
                  setSelectedDate(date);
                }}
                value={selectedDate}
                className="w-full border-none"
                tileClassName="hover:bg-blue-100 rounded"
                locale="en-US"
                calendarType="gregory"
              />
            </div>

            {/* Statistics */}
            <div className="lg:col-span-2">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📊 Purchase Statistics for {formatDateForDisplay(selectedDate)}
                </h3>
                
                {reportLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : reportStats ? (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{reportStats.totalUsers}</div>
                      <div className="text-sm text-blue-800">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{reportStats.usersWithPurchases}</div>
                      <div className="text-sm text-green-800">Made Purchase</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{reportStats.usersWithoutPurchases}</div>
                      <div className="text-sm text-red-800">No Purchase</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{reportStats.totalPurchases}</div>
                      <div className="text-sm text-yellow-800">Total Purchases</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(reportStats.totalAmount)}</div>
                      <div className="text-sm text-purple-800">Total Amount</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No data available for selected date
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Details Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              👥 User Purchases for {formatDateForDisplay(selectedDate)}
            </h3>
            
            {reportLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseReports.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 ${!user.hasPurchased ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-sm font-bold">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.hasPurchased 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.hasPurchased ? '✅ Purchased' : '❌ No Purchase'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.purchases.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(user.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.hasPurchased ? (
                            <div className="max-w-xs">
                              {user.purchases.map((purchase, idx) => (
                                <div key={idx} className="text-xs mb-1">
                                  {purchase.description} - {formatCurrency(purchase.amount)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No purchases</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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