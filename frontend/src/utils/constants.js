// Calculator operation constants
export const CALCULATOR_OPERATIONS = {
  ADDITION: 'addition',
  SUBTRACTION: 'subtraction',
  MULTIPLICATION: 'multiplication',
  DIVISION: 'division',
  SQUARE_ROOT: 'square_root',
  RANDOM_STRING: 'random_string'
};

// API endpoint constants
export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api',
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh'
  },
  OPERATIONS: {
    BASE: '/operations',
    LIST: '/operations',
    EXECUTE: '/operations/calculate'
  },
  RECORDS: {
    BASE: '/records',
    LIST: '/records',
    DELETE: '/records'
  },
  USER: {
    PROFILE: '/user/profile',
    BALANCE: '/user/balance'
  }
};

// Application constants
export const APP_CONSTANTS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // Local storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_PREFERENCES: 'user_preferences',
    THEME: 'theme_preference'
  },
  
  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },
  
  // Theme constants
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark'
  },
  
  // Calculator display constants
  CALCULATOR: {
    MAX_DIGITS: 15,
    DECIMAL_PLACES: 8,
    ERROR_MESSAGE: 'Error',
    INSUFFICIENT_BALANCE_MESSAGE: 'Insufficient balance'
  },
  
  // Debounce delays (in milliseconds)
  DEBOUNCE: {
    SEARCH: 300,
    API_CALLS: 500
  },
  
  // Date formats
  DATE_FORMATS: {
    DISPLAY: 'MMM DD, YYYY HH:mm:ss',
    API: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    SHORT: 'MMM DD, YYYY'
  },
  
  // Validation constants
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_USERNAME_LENGTH: 50,
    MAX_EMAIL_LENGTH: 100
  },
  
  // Error messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Please log in to continue.',
    INSUFFICIENT_BALANCE: 'Insufficient balance to perform this operation.',
    INVALID_OPERATION: 'Invalid operation selected.',
    GENERIC_ERROR: 'An error occurred. Please try again.'
  },
  
  // Success messages
  SUCCESS_MESSAGES: {
    OPERATION_SUCCESS: 'Operation completed successfully.',
    LOGIN_SUCCESS: 'Login successful.',
    LOGOUT_SUCCESS: 'Logout successful.',
    RECORD_DELETED: 'Record deleted successfully.'
  },
  
  // Operation symbols for display
  OPERATION_SYMBOLS: {
    [CALCULATOR_OPERATIONS.ADDITION]: '+',
    [CALCULATOR_OPERATIONS.SUBTRACTION]: '-',
    [CALCULATOR_OPERATIONS.MULTIPLICATION]: '×',
    [CALCULATOR_OPERATIONS.DIVISION]: '÷',
    [CALCULATOR_OPERATIONS.SQUARE_ROOT]: '√',
    [CALCULATOR_OPERATIONS.RANDOM_STRING]: 'RND'
  }
};