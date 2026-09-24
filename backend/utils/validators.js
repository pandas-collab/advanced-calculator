const validator = require('validator');

// Email validation with comprehensive regex pattern
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (typeof email !== 'string') {
    return { isValid: false, message: 'Email must be a string' };
  }
  
  if (email.length > 254) {
    return { isValid: false, message: 'Email is too long' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }
  
  if (!validator.isEmail(email)) {
    return { isValid: false, message: 'Invalid email address' };
  }
  
  return { isValid: true, message: 'Valid email' };
};

// Password validation with security requirements
const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (typeof password !== 'string') {
    return { isValid: false, message: 'Password must be a string' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password is too long (max 128 characters)' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one digit
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one digit' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, message: 'Password is too common' };
  }
  
  return { isValid: true, message: 'Valid password' };
};

// Registration form validation
const validateRegistration = (data) => {
  const errors = {};
  
  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
  }
  
  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.message;
  }
  
  // Validate confirm password
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Validate first name
  if (!data.firstName) {
    errors.firstName = 'First name is required';
  } else if (typeof data.firstName !== 'string') {
    errors.firstName = 'First name must be a string';
  } else if (data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters long';
  } else if (data.firstName.length > 50) {
    errors.firstName = 'First name is too long (max 50 characters)';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.firstName)) {
    errors.firstName = 'First name contains invalid characters';
  }
  
  // Validate last name
  if (!data.lastName) {
    errors.lastName = 'Last name is required';
  } else if (typeof data.lastName !== 'string') {
    errors.lastName = 'Last name must be a string';
  } else if (data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters long';
  } else if (data.lastName.length > 50) {
    errors.lastName = 'Last name is too long (max 50 characters)';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.lastName)) {
    errors.lastName = 'Last name contains invalid characters';
  }
  
  // Validate terms acceptance if required
  if (data.hasOwnProperty('acceptTerms') && !data.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    message: Object.keys(errors).length === 0 ? 'Registration data is valid' : 'Validation failed'
  };
};

// Login form validation
const validateLogin = (data) => {
  const errors = {};
  
  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
  }
  
  // Validate password (less strict for login)
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (typeof data.password !== 'string') {
    errors.password = 'Password must be a string';
  } else if (data.password.length < 1) {
    errors.password = 'Password cannot be empty';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    message: Object.keys(errors).length === 0 ? 'Login data is valid' : 'Validation failed'
  };
};

// Profile update validation
const validateProfile = (data) => {
  const errors = {};
  
  // Validate first name (optional for updates)
  if (data.firstName !== undefined) {
    if (!data.firstName) {
      errors.firstName = 'First name cannot be empty';
    } else if (typeof data.firstName !== 'string') {
      errors.firstName = 'First name must be a string';
    } else if (data.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters long';
    } else if (data.firstName.length > 50) {
      errors.firstName = 'First name is too long (max 50 characters)';
    } else if (!/^[a-zA-Z\s'-]+$/.test(data.firstName)) {
      errors.firstName = 'First name contains invalid characters';
    }
  }
  
  // Validate last name (optional for updates)
  if (data.lastName !== undefined) {
    if (!data.lastName) {
      errors.lastName = 'Last name cannot be empty';
    } else if (typeof data.lastName !== 'string') {
      errors.lastName = 'Last name must be a string';
    } else if (data.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters long';
    } else if (data.lastName.length > 50) {
      errors.lastName = 'Last name is too long (max 50 characters)';
    } else if (!/^[a-zA-Z\s'-]+$/.test(data.lastName)) {
      errors.lastName = 'Last name contains invalid characters';
    }
  }
  
  // Validate email (optional for updates)
  if (data.email !== undefined) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message;
    }
  }
  
  // Validate phone number (optional)
  if (data.phone !== undefined && data.phone) {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone number must be a string';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(data.phone)) {
      errors.phone = 'Invalid phone number format';
    } else if (data.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Phone number must be at least 10 digits';
    }
  }
  
  // Validate date of birth (optional)
  if (data.dateOfBirth !== undefined && data.dateOfBirth) {
    if (!validator.isISO8601(data.dateOfBirth)) {
      errors.dateOfBirth = 'Invalid date format';
    } else {
      const dob = new Date(data.dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      
      if (age < 13) {
        errors.dateOfBirth = 'Must be at least 13 years old';
      } else if (age > 120) {
        errors.dateOfBirth = 'Invalid date of birth';
      }
    }
  }
  
  // Validate bio (optional)
  if (data.bio !== undefined) {
    if (data.bio && typeof data.bio !== 'string') {
      errors.bio = 'Bio must be a string';
    } else if (data.bio && data.bio.length > 500) {
      errors.bio = 'Bio is too long (max 500 characters)';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    message: Object.keys(errors).length === 0 ? 'Profile data is valid' : 'Validation failed'
  };
};

// Input sanitization utility
const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  let sanitized = input;
  
  // Trim whitespace by default
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  // Escape HTML by default
  if (options.escapeHtml !== false) {
    sanitized = validator.escape(sanitized);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Normalize whitespace
  if (options.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }
  
  // Convert to lowercase
  if (options.toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }
  
  // Remove non-alphanumeric characters (except specified)
  if (options.alphanumericOnly) {
    const allowedChars = options.allowedChars || '';
    const regex = new RegExp(`[^a-zA-Z0-9${allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
    sanitized = sanitized.replace(regex, '');
  }
  
  // Limit length
  if (options.maxLength && typeof options.maxLength === 'number') {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
  validateProfile,
  sanitizeInput
};