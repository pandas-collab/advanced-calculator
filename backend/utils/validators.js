const validator = require('validator');

// Email validation utility
const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  if (typeof email !== 'string') {
    errors.push('Email must be a string');
    return { isValid: false, errors };
  }
  
  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    errors.push('Email cannot be empty');
    return { isValid: false, errors };
  }
  
  if (!validator.isEmail(trimmedEmail)) {
    errors.push('Please provide a valid email address');
    return { isValid: false, errors };
  }
  
  if (trimmedEmail.length > 254) {
    errors.push('Email address is too long (maximum 254 characters)');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [], value: trimmedEmail.toLowerCase() };
};

// Password validation utility
const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long (maximum 128 characters)');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'Password1', 'password1', '123456789', 'welcome123', 'admin123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Login input validation
const validateLoginInput = (data) => {
  const errors = {};
  let isValid = true;
  
  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
    isValid = false;
  }
  
  // Validate password presence (not strength for login)
  if (!data.password) {
    errors.password = ['Password is required'];
    isValid = false;
  } else if (typeof data.password !== 'string') {
    errors.password = ['Password must be a string'];
    isValid = false;
  } else if (data.password.trim().length === 0) {
    errors.password = ['Password cannot be empty'];
    isValid = false;
  }
  
  return {
    isValid,
    errors,
    sanitizedData: {
      email: emailValidation.isValid ? emailValidation.value : data.email,
      password: data.password
    }
  };
};

// Registration input validation
const validateRegisterInput = (data) => {
  const errors = {};
  let isValid = true;
  const sanitizedData = {};
  
  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
    isValid = false;
  } else {
    sanitizedData.email = emailValidation.value;
  }
  
  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
    isValid = false;
  } else {
    sanitizedData.password = data.password;
  }
  
  // Validate password confirmation
  if (!data.confirmPassword) {
    errors.confirmPassword = ['Password confirmation is required'];
    isValid = false;
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = ['Passwords do not match'];
    isValid = false;
  }
  
  // Validate name fields
  if (data.firstName !== undefined) {
    const firstNameValidation = validateName(data.firstName, 'First name');
    if (!firstNameValidation.isValid) {
      errors.firstName = firstNameValidation.errors;
      isValid = false;
    } else {
      sanitizedData.firstName = firstNameValidation.value;
    }
  }
  
  if (data.lastName !== undefined) {
    const lastNameValidation = validateName(data.lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      errors.lastName = lastNameValidation.errors;
      isValid = false;
    } else {
      sanitizedData.lastName = lastNameValidation.value;
    }
  }
  
  return { isValid, errors, sanitizedData };
};

// Profile input validation
const validateProfileInput = (data) => {
  const errors = {};
  let isValid = true;
  const sanitizedData = {};
  
  // Validate email if provided
  if (data.email !== undefined) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors;
      isValid = false;
    } else {
      sanitizedData.email = emailValidation.value;
    }
  }
  
  // Validate name fields if provided
  if (data.firstName !== undefined) {
    const firstNameValidation = validateName(data.firstName, 'First name');
    if (!firstNameValidation.isValid) {
      errors.firstName = firstNameValidation.errors;
      isValid = false;
    } else {
      sanitizedData.firstName = firstNameValidation.value;
    }
  }
  
  if (data.lastName !== undefined) {
    const lastNameValidation = validateName(data.lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      errors.lastName = lastNameValidation.errors;
      isValid = false;
    } else {
      sanitizedData.lastName = lastNameValidation.value;
    }
  }
  
  // Validate phone if provided
  if (data.phone !== undefined) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.errors;
      isValid = false;
    } else {
      sanitizedData.phone = phoneValidation.value;
    }
  }
  
  // Validate bio if provided
  if (data.bio !== undefined) {
    const bioValidation = validateBio(data.bio);
    if (!bioValidation.isValid) {
      errors.bio = bioValidation.errors;
      isValid = false;
    } else {
      sanitizedData.bio = bioValidation.value;
    }
  }
  
  return { isValid, errors, sanitizedData };
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
  
  // Escape HTML entities
  if (options.escapeHtml !== false) {
    sanitized = validator.escape(sanitized);
  }
  
  // Remove or replace specific characters
  if (options.removeSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s.-]/gi, '');
  }
  
  // Normalize whitespace
  if (options.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }
  
  // Convert to lowercase
  if (options.toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }
  
  // Limit length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
};

// Helper function to validate names
const validateName = (name, fieldName = 'Name') => {
  const errors = [];
  
  if (!name) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }
  
  if (typeof name !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { isValid: false, errors };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
    return { isValid: false, errors };
  }
  
  if (trimmedName.length < 2) {
    errors.push(`${fieldName} must be at least 2 characters long`);
  }
  
  if (trimmedName.length > 50) {
    errors.push(`${fieldName} is too long (maximum 50 characters)`);
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    value: trimmedName.replace(/\s+/g, ' ') 
  };
};

// Helper function to validate phone numbers
const validatePhone = (phone) => {
  const errors = [];
  
  if (!phone) {
    return { isValid: true, errors: [], value: phone };
  }
  
  if (typeof phone !== 'string') {
    errors.push('Phone number must be a string');
    return { isValid: false, errors };
  }
  
  const trimmedPhone = phone.trim();
  
  if (trimmedPhone.length === 0) {
    return { isValid: true, errors: [], value: '' };
  }
  
  // Remove common formatting characters for validation
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)\+]/g, '');
  
  if (!/^\d{10,15}$/.test(cleanPhone)) {
    errors.push('Phone number must contain 10-15 digits');
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    value: trimmedPhone 
  };
};

// Helper function to validate bio
const validateBio = (bio) => {
  const errors = [];
  
  if (!bio) {
    return { isValid: true, errors: [], value: bio };
  }
  
  if (typeof bio !== 'string') {
    errors.push('Bio must be a string');
    return { isValid: false, errors };
  }
  
  const trimmedBio = bio.trim();
  
  if (trimmedBio.length > 500) {
    errors.push('Bio is too long (maximum 500 characters)');
  }
  
  // Check for potentially harmful content
  if (/<script|javascript:|on\w+=/i.test(trimmedBio)) {
    errors.push('Bio contains invalid content');
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    value: trimmedBio 
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateLoginInput,
  validateRegisterInput,
  validateProfileInput,
  sanitizeInput
};