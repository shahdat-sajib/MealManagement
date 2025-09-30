import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { mealsApi, purchasesApi, usersApi } from '../services/api';
import { formatDate, formatDateForDisplay } from '../utils/helpers';

const AdminReports = () => {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [users, setUsers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('meals');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDateWiseData();
    }
  }, [selectedDate, activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchDateWiseData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'meals') {
        await fetchMealsForDate();
      } else {
        await fetchPurchasesForDate();
      }
    } catch (error) {
      console.error('Error fetching date-wise data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMealsForDate = async () => {
    const response = await mealsApi.getAllMeals({
      startDate: selectedDate,
      endDate: selectedDate
    });

    if (response.success) {
      setMeals(response.data.meals);
    }
  };

  const fetchPurchasesForDate = async () => {
    const response = await purchasesApi.getAllPurchases({
      startDate: selectedDate,
      endDate: selectedDate
    });

    if (response.success) {
      setPurchases(response.data.purchases);
    }
  };

  const getUsersWithMeals = () => {
    const usersWithMeals = meals.map(meal => meal.user._id);
    return users.map(user => ({
      ...user,
      hasMeal: usersWithMeals.includes(user._id),
      meal: meals.find(meal => meal.user._id === user._id)
    }));
  };

  const getUsersWithPurchases = () => {
    const userPurchases = purchases.reduce((acc, purchase) => {
      const userId = purchase.user._id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(purchase);
      return acc;
    }, {});

    return users.map(user => ({
      ...user,
      purchases: userPurchases[user._id] || [],
      totalAmount: userPurchases[user._id] ? 
        userPurchases[user._id].reduce((sum, p) => sum + p.amount, 0) : 0
    }));
  };

  const getMealStats = () => {
    const usersWithMeals = getUsersWithMeals();
    const totalUsers = users.length;
    const orderedCount = usersWithMeals.filter(u => u.hasMeal).length;
    const notOrderedCount = totalUsers - orderedCount;

    return { totalUsers, orderedCount, notOrderedCount };
  };

  const getPurchaseStats = () => {
    const usersWithPurchases = getUsersWithPurchases();
    const totalUsers = users.length;
    const purchasedCount = usersWithPurchases.filter(u => u.purchases.length > 0).length;
    const notPurchasedCount = totalUsers - purchasedCount;
    const totalAmount = usersWithPurchases.reduce((sum, u) => sum + u.totalAmount, 0);

    return { totalUsers, purchasedCount, notPurchasedCount, totalAmount };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          📊 Admin Reports - Date-wise Analysis
        </h1>

        {/* Date Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('meals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'meals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🍽️ Meal Orders
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'purchases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🛒 Purchases
            </button>
          </nav>
        </div>

        {selectedDate && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Report for {formatDateForDisplay(selectedDate)}
            </h2>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'meals' && (
              <div className="space-y-6">
                {/* Meal Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const stats = getMealStats();
                    return (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-green-600 text-2xl mr-3">✅</div>
                            <div>
                              <p className="text-green-800 font-semibold">Ordered</p>
                              <p className="text-green-600 text-xl font-bold">{stats.orderedCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-red-600 text-2xl mr-3">❌</div>
                            <div>
                              <p className="text-red-800 font-semibold">Not Ordered</p>
                              <p className="text-red-600 text-xl font-bold">{stats.notOrderedCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-blue-600 text-2xl mr-3">👥</div>
                            <div>
                              <p className="text-blue-800 font-semibold">Total Users</p>
                              <p className="text-blue-600 text-xl font-bold">{stats.totalUsers}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Meal Details Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Detailed Meal Orders</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Meal Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getUsersWithMeals().map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.hasMeal ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  ✅ Ordered
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  ❌ Not Ordered
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.meal ? (
                                <div className="text-sm text-gray-900">
                                  <div className="font-medium">{user.meal.mealType}</div>
                                  <div className="text-gray-500">{user.meal.description}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No meal ordered</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purchases' && (
              <div className="space-y-6">
                {/* Purchase Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(() => {
                    const stats = getPurchaseStats();
                    return (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-green-600 text-2xl mr-3">🛒</div>
                            <div>
                              <p className="text-green-800 font-semibold">Made Purchase</p>
                              <p className="text-green-600 text-xl font-bold">{stats.purchasedCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-red-600 text-2xl mr-3">🚫</div>
                            <div>
                              <p className="text-red-800 font-semibold">No Purchase</p>
                              <p className="text-red-600 text-xl font-bold">{stats.notPurchasedCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-blue-600 text-2xl mr-3">👥</div>
                            <div>
                              <p className="text-blue-800 font-semibold">Total Users</p>
                              <p className="text-blue-600 text-xl font-bold">{stats.totalUsers}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="text-purple-600 text-2xl mr-3">💰</div>
                            <div>
                              <p className="text-purple-800 font-semibold">Total Amount</p>
                              <p className="text-purple-600 text-xl font-bold">${stats.totalAmount.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Purchase Details Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Detailed Purchase Records</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purchase Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getUsersWithPurchases().map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.purchases.length > 0 ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  🛒 {user.purchases.length} Purchase{user.purchases.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  🚫 No Purchase
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {user.purchases.length > 0 ? (
                                <div className="text-sm text-gray-900 max-w-xs">
                                  {user.purchases.map((purchase, index) => (
                                    <div key={purchase._id} className="mb-1">
                                      <div className="font-medium">{purchase.description}</div>
                                      {user.purchases.length > 1 && (
                                        <div className="text-xs text-gray-500">
                                          Purchase {index + 1} - ${purchase.amount.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No purchases made</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.totalAmount > 0 ? (
                                <span className="text-sm font-semibold text-green-600">
                                  ${user.totalAmount.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-400">$0.00</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminReports;