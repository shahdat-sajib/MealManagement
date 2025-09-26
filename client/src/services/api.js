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
  
  // Get all meals (admin only)
  getAllMeals: (params = {}) => apiCall('GET', `/meals/all?${new URLSearchParams(params)}`),
  
  // Add new meal
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
  // Get user dashboard
  getDashboard: (params = {}) => apiCall('GET', `/dashboard?${new URLSearchParams(params)}`),
  
  // Get admin dashboard
  getAdminDashboard: (params = {}) => apiCall('GET', `/dashboard/admin?${new URLSearchParams(params)}`),
  
  // Get expense history
  getHistory: (params = {}) => apiCall('GET', `/dashboard/history?${new URLSearchParams(params)}`)
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

export default {
  meals: mealsApi,
  purchases: purchasesApi,
  dashboard: dashboardApi,
  advancePayments: advancePaymentsApi
};