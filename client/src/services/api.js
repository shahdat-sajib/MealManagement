import axios from 'axios';

// Determine the API base URL correctly
const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) {
    // Production: use the full backend URL + /api
    return `${process.env.REACT_APP_API_URL}/api`;
  } else {
    // Development: use relative path
    return '/api';
  }
};

const API_BASE = getApiBase();

// Configure axios defaults - don't set baseURL when using full URLs
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Generic API call function
const apiCall = async (method, url, data = null) => {
  try {
    const fullUrl = `${API_BASE}${url}`;
    console.log('🔗 API Call:', method, fullUrl); // Debug log
    
    const config = {
      method,
      url: fullUrl,
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ API Error:', error.response?.status, error.response?.data);
    return {
      success: false,
      error: error.response?.data?.message || 'An error occurred'
    };
  }
};

// Meals API
export const mealsApi = {
  // Get user's meals
  getMeals: (params = {}) => apiCall('GET', `/meals?${new URLSearchParams(params)}`),
  
  // Alias for getUserMeals
  getUserMeals: (params = {}) => apiCall('GET', `/meals?${new URLSearchParams(params)}`),
  
  // Get all meals (admin only)
  getAllMeals: (params = {}) => apiCall('GET', `/meals/all?${new URLSearchParams(params)}`),
  
  // Get all users (admin only) - for meal assignment
  getUsers: () => apiCall('GET', '/meals/users'),
  
  // Add new meal (can include userId for admin)
  addMeal: (mealData) => apiCall('POST', '/meals', mealData),
  
  // Update meal
  updateMeal: (id, mealData) => apiCall('PUT', `/meals/${id}`, mealData),
  
  // Delete meal
  deleteMeal: (id) => apiCall('DELETE', `/meals/${id}`),
  
  // Get calendar data
  getCalendar: (year, month) => apiCall('GET', `/meals/calendar/${year}/${month}`)
};

// Purchases API
export const purchasesApi = {
  // Get user's purchases
  getPurchases: (params = {}) => apiCall('GET', `/purchases?${new URLSearchParams(params)}`),
  
  // Alias for getUserPurchases
  getUserPurchases: (params = {}) => apiCall('GET', `/purchases?${new URLSearchParams(params)}`),
  
  // Get all purchases (admin only)
  getAllPurchases: (params = {}) => apiCall('GET', `/purchases/all?${new URLSearchParams(params)}`),
  
  // Add new purchase
  addPurchase: (purchaseData) => apiCall('POST', '/purchases', purchaseData),
  
  // Update purchase
  updatePurchase: (id, purchaseData) => apiCall('PUT', `/purchases/${id}`, purchaseData),
  
  // Delete purchase
  deletePurchase: (id) => apiCall('DELETE', `/purchases/${id}`),
  
  // Get purchase statistics
  getStats: (params = {}) => apiCall('GET', `/purchases/stats?${new URLSearchParams(params)}`)
};

// Dashboard API
export const dashboardApi = {
  // Get user dashboard (legacy)
  getDashboard: (params = {}) => apiCall('GET', `/dashboard?${new URLSearchParams(params)}`),
  
  // Get new weekly dashboard
  getWeeklyDashboard: (params = {}) => apiCall('GET', `/dashboard/weekly?${new URLSearchParams(params)}`),
  
  // Get admin dashboard (legacy)
  getAdminDashboard: (params = {}) => apiCall('GET', `/dashboard/admin?${new URLSearchParams(params)}`),
  
  // Get enhanced admin dashboard
  getEnhancedAdminDashboard: (params = {}) => apiCall('GET', `/dashboard/admin/enhanced?${new URLSearchParams(params)}`),
  
  // Get expense history
  getHistory: (params = {}) => apiCall('GET', `/dashboard/history?${new URLSearchParams(params)}`),
  
  // Get users with dynamic advance balance (Admin only)
  getUsersWithBalance: () => apiCall('GET', '/dashboard/users-with-balance'),
  
  // Clear user due manually (Admin only)
  clearUserDue: (data) => apiCall('POST', '/dashboard/clear-due', data),
  
  // Get user's payment history
  getMyPayments: () => apiCall('GET', '/dashboard/my-payments')
};

// Calculation API
export const calculationApi = {
  // Recalculate all weekly balances (Admin only)
  recalculateAll: () => apiCall('POST', '/calculation/recalculate-all'),
  
  // Get system statistics
  getSystemStats: () => apiCall('GET', '/calculation/system-stats')
};

// Users API
export const usersApi = {
  // Get all users (admin only)
  getUsers: () => apiCall('GET', '/auth/users')
};

// Advance Payments API
export const advancePaymentsApi = {
  // Get all advance payments (admin only)
  getPayments: () => apiCall('GET', '/advance-payments'),
  
  // Add advance payment (admin only)
  addPayment: (paymentData) => apiCall('POST', '/advance-payments', paymentData),
  
  // Get payments for specific user (admin only)
  getUserPayments: (userId) => apiCall('GET', `/advance-payments/user/${userId}`),
  
  // Delete advance payment (admin only)
  deletePayment: (paymentId) => apiCall('DELETE', `/advance-payments/${paymentId}`)
};

// Due Adjustments API
export const dueAdjustmentsApi = {
  async getAdjustments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiCall('GET', `/due-adjustments${query ? '?' + query : ''}`);
  },

  async makeAdjustment(adjustmentData) {
    return await apiCall('POST', '/due-adjustments/adjust', adjustmentData);
  },

  async getUserAdjustments(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiCall('GET', `/due-adjustments/user/${userId}${query ? '?' + query : ''}`);
  },

  async deleteAdjustment(adjustmentId) {
    return await apiCall('DELETE', `/due-adjustments/${adjustmentId}`);
  }
};

export default {
  meals: mealsApi,
  purchases: purchasesApi,
  dashboard: dashboardApi,
  users: usersApi,
  advancePayments: advancePaymentsApi,
  dueAdjustments: dueAdjustmentsApi
};