import moment from 'moment';

// Date utilities
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

export const formatDateForDisplay = (date) => {
  return moment(date).format('MMM DD, YYYY');
};

export const formatDateTimeForDisplay = (date) => {
  return moment(date).format('MMM DD, YYYY HH:mm');
};

export const isToday = (date) => {
  return moment(date).isSame(moment(), 'day');
};

export const isFuture = (date) => {
  return moment(date).isAfter(moment(), 'day');
};

export const isPast = (date) => {
  return moment(date).isBefore(moment(), 'day');
};

export const canAddMealForDate = (date, isAdmin = false) => {
  // Admin users can add meals for any date
  if (isAdmin) {
    return { canAdd: true, reason: 'Admin privileges - no date restrictions' };
  }
  
  const mealDate = moment(date);
  
  // Can't add meals for past dates
  if (mealDate.isBefore(moment(), 'day')) {
    return { canAdd: false, reason: 'Cannot add meals for past dates' };
  }
  
  // Can't schedule meal more than 15 days in advance
  const maxAdvanceDate = moment().add(15, 'days');
  if (mealDate.isAfter(maxAdvanceDate)) {
    return { canAdd: false, reason: 'Cannot schedule meals more than 15 days in advance' };
  }
  
  return { canAdd: true };
};

export const canEditMealForDate = (date, isAdmin = false) => {
  // Admin users can edit meals for any date
  if (isAdmin) {
    return { canEdit: true, reason: 'Admin privileges - no date restrictions' };
  }
  
  const mealDate = moment(date);
  
  // Can't edit meals for past dates
  if (mealDate.isBefore(moment(), 'day')) {
    return { canEdit: false, reason: 'Cannot edit meals for past dates' };
  }
  
  return { canEdit: true };
};

// Number utilities
export const formatCurrency = (amount, currency = '$') => {
  return `${currency}${parseFloat(amount).toFixed(2)}`;
};

export const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// String utilities
export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

// Validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

// Local storage utilities
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error getting localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing localStorage:', error);
  }
};

// Debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Generate color for charts
export const generateColors = (count) => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
};