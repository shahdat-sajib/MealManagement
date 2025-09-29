import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { mealsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateForDisplay, canAddMealForDate, canEditMealForDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import 'react-calendar/dist/Calendar.css';

const Meals = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: formatDate(new Date()),
    description: '',
    mealType: 'breakfast',
    userId: ''
  });

  useEffect(() => {
    fetchMeals();
    fetchCalendarData();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    fetchCalendarData();
  }, [selectedDate]);

  const fetchMeals = async () => {
    const result = await mealsApi.getMeals();
    
    if (result.success) {
      setMeals(result.data.meals);
    } else {
      toast.error('Failed to fetch meals');
    }
    setLoading(false);
  };

  const fetchCalendarData = async () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    
    const result = await mealsApi.getCalendar(year, month);
    
    if (result.success) {
      setCalendarData(result.data.calendar);
    }
  };

  const fetchUsers = async () => {
    const result = await mealsApi.getUsers();
    
    if (result.success) {
      setUsers(result.data.users);
    } else {
      toast.error('Failed to fetch users');
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      date: formatDate(date)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    
    // Check date restrictions (admin users can bypass)
    const validation = canAddMealForDate(formData.date, user?.role === 'admin');
    if (!validation.canAdd && user?.role !== 'admin') {
      toast.error(validation.reason);
      return;
    }

    // Prepare meal data
    const mealData = { ...formData };
    if (user?.role === 'admin' && formData.userId) {
      mealData.userId = formData.userId;
    }

    const result = await mealsApi.addMeal(mealData);
    
    if (result.success) {
      toast.success('Meal added successfully!');
      setShowAddForm(false);
      setFormData({
        date: formatDate(new Date()),
        description: '',
        mealType: 'breakfast',
        userId: ''
      });
      fetchMeals();
      fetchCalendarData();
    } else {
      toast.error(result.error);
    }
  };

  const handleEditMeal = async (e) => {
    e.preventDefault();
    
    const result = await mealsApi.updateMeal(editingMeal._id, {
      description: formData.description,
      mealType: formData.mealType
    });
    
    if (result.success) {
      toast.success('Meal updated successfully!');
      setShowEditForm(false);
      setEditingMeal(null);
      fetchMeals();
      fetchCalendarData();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteMeal = async (mealId, mealDate) => {
    const validation = canEditMealForDate(mealDate);
    if (!validation.canEdit) {
      toast.error(validation.reason);
      return;
    }

    if (window.confirm('Are you sure you want to delete this meal?')) {
      const result = await mealsApi.deleteMeal(mealId);
      
      if (result.success) {
        toast.success('Meal deleted successfully!');
        fetchMeals();
        fetchCalendarData();
      } else {
        toast.error(result.error);
      }
    }
  };

  const openEditForm = (meal) => {
    const validation = canEditMealForDate(meal.date);
    if (!validation.canEdit) {
      toast.error(validation.reason);
      return;
    }

    setEditingMeal(meal);
    setFormData({
      date: formatDate(meal.date),
      description: meal.description,
      mealType: meal.mealType
    });
    setShowEditForm(true);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = formatDate(date);
      const mealData = calendarData[dateKey];
      
      if (mealData) {
        return (
          <div className={`meal-highlight ${mealData.isScheduled ? 'meal-scheduled' : ''}`}></div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = formatDate(date);
      const mealData = calendarData[dateKey];
      
      if (mealData) {
        return 'has-meal';
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meals</h1>
          <p className="text-gray-600">Schedule and manage your daily breakfast meals</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          Add Meal
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-600 text-2xl mr-3">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-800">Daily Access</p>
              <p className="text-sm text-blue-600">Meals can be added anytime during the day</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-600 text-2xl mr-3">📅</span>
            <div>
              <p className="font-semibold text-green-800">Advance Scheduling</p>
              <p className="text-sm text-green-600">Schedule up to 15 days ahead</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-yellow-600 text-2xl mr-3">🍽️</span>
            <div>
              <p className="font-semibold text-yellow-800">Total Meals</p>
              <p className="text-sm text-yellow-600">{meals.length} meals recorded</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Calendar</h3>
          <div className="meal-calendar">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="w-full"
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-success-500 rounded-full mr-2"></div>
                <span>Confirmed Meal</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Scheduled Meal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Meals */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Meals</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {meals.length > 0 ? (
              meals.slice(0, 10).map((meal) => (
                <div key={meal._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {meal.description || `${meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)} meal`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDateForDisplay(meal.date)}
                      {meal.isScheduled && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Scheduled
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditForm(meal)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(meal._id, meal.date)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No meals recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Meal Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Meal</h3>
            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  required
                />
              </div>
              
              {/* User Selection - Admin Only */}
              {user?.role === 'admin' && (
                <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                    Select User <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="userId"
                    name="userId"
                    value={formData.userId}
                    onChange={handleInputChange}
                    className="mt-1 input"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {users.map((userItem) => (
                      <option key={userItem._id} value={userItem._id}>
                        {userItem.name} ({userItem.email})
                        {userItem.role === 'admin' && ' - Admin'}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    As an admin, you can add meals for any user at any time.
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Meal Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  placeholder="Leave blank for default description"
                />
              </div>
              
              <div>
                <label htmlFor="mealType" className="block text-sm font-medium text-gray-700">
                  Meal Type
                </label>
                <select
                  id="mealType"
                  name="mealType"
                  value={formData.mealType}
                  onChange={handleInputChange}
                  className="mt-1 input"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {showEditForm && editingMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Meal</h3>
            <form onSubmit={handleEditMeal} className="space-y-4">
              <div>
                <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="edit-date"
                  value={formData.date}
                  className="mt-1 input bg-gray-100"
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Meal Description (Optional)
                </label>
                <input
                  type="text"
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  placeholder="Leave blank for default description"
                />
              </div>
              
              <div>
                <label htmlFor="edit-mealType" className="block text-sm font-medium text-gray-700">
                  Meal Type
                </label>
                <select
                  id="edit-mealType"
                  name="mealType"
                  value={formData.mealType}
                  onChange={handleInputChange}
                  className="mt-1 input"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingMeal(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meals;