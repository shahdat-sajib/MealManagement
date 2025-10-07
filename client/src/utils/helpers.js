import moment from 'moment';

// Date utilities
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

export const formatDateForDisplay = (date) => {
  return moment(date).format('MMM DD, YYYY');
};

// Format date for API calls (timezone-safe)
export const formatDateForAPI = (date) => {
  // Use the local date values to avoid timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// Week utilities for proper calendar week filtering
export const getWeekDateRange = (weekNumber, month, year) => {
  const targetMonth = month !== undefined ? month - 1 : moment().month(); // moment months are 0-based
  const targetYear = year !== undefined ? year : moment().year();
  
  const monthStart = moment().year(targetYear).month(targetMonth).date(1);
  const monthEnd = moment().year(targetYear).month(targetMonth).endOf('month');
  
  let start, end;
  
  if (weekNumber === 1) {
    // Week 1: 1st to 7th
    start = monthStart.clone().date(1);
    end = monthStart.clone().date(7);
  } else if (weekNumber === 2) {
    // Week 2: 8th to 14th  
    start = monthStart.clone().date(8);
    end = monthStart.clone().date(14);
  } else if (weekNumber === 3) {
    // Week 3: 15th to 21st
    start = monthStart.clone().date(15);
    end = monthStart.clone().date(21);
  } else if (weekNumber === 4) {
    // Week 4: 22nd to end of month
    start = monthStart.clone().date(22);
    end = monthEnd.clone();
  } else {
    // Invalid week number, return current week
    start = moment().startOf('week');
    end = moment().endOf('week');
  }
  
  // Ensure we don't go beyond the month boundaries
  if (end.isAfter(monthEnd)) {
    end = monthEnd.clone();
  }
  
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    display: `${start.format('MMM DD')} - ${end.format('MMM DD, YYYY')}`
  };
};

export const getCurrentMonthYear = () => {
  const now = moment();
  return {
    month: now.month() + 1, // Convert to 1-based
    year: now.year(),
    display: now.format('MMMM YYYY')
  };
};

export const getMonthOptions = (monthsBack = 12, monthsForward = 3) => {
  const options = [];
  const current = moment();
  
  // Add past months (including current)
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthMoment = current.clone().subtract(i, 'months');
    options.push({
      value: {
        month: monthMoment.month() + 1,
        year: monthMoment.year()
      },
      label: monthMoment.format('MMMM YYYY'),
      key: monthMoment.format('YYYY-MM')
    });
  }
  
  // Add future months
  for (let i = 1; i <= monthsForward; i++) {
    const monthMoment = current.clone().add(i, 'months');
    options.push({
      value: {
        month: monthMoment.month() + 1,
        year: monthMoment.year()
      },
      label: monthMoment.format('MMMM YYYY'),
      key: monthMoment.format('YYYY-MM')
    });
  }
  
  return options;
};

// Get a human-readable description of the current filter selection
export const getFilterDescription = (dateRange, selectedMonth) => {
  const monthName = moment().month(selectedMonth.month - 1).format('MMMM');
  
  switch (dateRange) {
    case 'current-week':
      return 'Current Week';
    case 'week-1':
      return `Week 1 (1st-7th) of ${monthName} ${selectedMonth.year}`;
    case 'week-2':
      return `Week 2 (8th-14th) of ${monthName} ${selectedMonth.year}`;
    case 'week-3':
      return `Week 3 (15th-21st) of ${monthName} ${selectedMonth.year}`;
    case 'week-4':
      return `Week 4 (22nd-End) of ${monthName} ${selectedMonth.year}`;
    case 'current-month':
      return `Full ${monthName} ${selectedMonth.year}`;
    default:
      return 'Custom Range';
  }
};