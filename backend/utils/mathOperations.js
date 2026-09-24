const math = require('mathjs');

/**
 * Evaluates a mathematical expression safely
 * @param {string} expression - The mathematical expression to evaluate
 * @returns {Object} - Result object with value and error status
 */
function evaluateExpression(expression) {
  try {
    if (!expression || typeof expression !== 'string') {
      throw new Error('Invalid expression format');
    }

    // Sanitize expression - remove potential harmful functions
    const sanitizedExpression = sanitizeExpression(expression);
    
    // Create a limited math context for security
    const limitedMath = math.create({
      matrix: 'Array',
      number: 'number'
    });
    
    // Remove potentially dangerous functions
    limitedMath.import({
      import: () => { throw new Error('Function disabled') },
      createUnit: () => { throw new Error('Function disabled') },
      evaluate: () => { throw new Error('Function disabled') },
      parse: () => { throw new Error('Function disabled') }
    }, { override: true });

    const result = limitedMath.evaluate(sanitizedExpression);
    
    return {
      success: true,
      value: result,
      error: null,
      expression: sanitizedExpression
    };
  } catch (error) {
    return {
      success: false,
      value: null,
      error: error.message,
      expression: expression
    };
  }
}

/**
 * Validates if an expression is mathematically valid
 * @param {string} expression - The expression to validate
 * @returns {Object} - Validation result
 */
function validateExpression(expression) {
  try {
    if (!expression || typeof expression !== 'string') {
      return {
        isValid: false,
        error: 'Expression must be a non-empty string',
        suggestions: ['Provide a valid mathematical expression']
      };
    }

    // Check for basic syntax issues
    const sanitized = sanitizeExpression(expression);
    
    // Check for balanced parentheses
    if (!hasBalancedParentheses(sanitized)) {
      return {
        isValid: false,
        error: 'Unbalanced parentheses',
        suggestions: ['Check opening and closing parentheses']
      };
    }

    // Check for invalid characters
    const invalidChars = /[^0-9+\-*/().\s\^sqrtlogsincostandgexpabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_]/;
    if (invalidChars.test(sanitized)) {
      return {
        isValid: false,
        error: 'Contains invalid characters',
        suggestions: ['Use only numbers, operators, and mathematical functions']
      };
    }

    // Try to parse with math.js
    try {
      math.parse(sanitized);
      return {
        isValid: true,
        error: null,
        suggestions: []
      };
    } catch (parseError) {
      return {
        isValid: false,
        error: parseError.message,
        suggestions: ['Check expression syntax']
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Validation failed: ' + error.message,
      suggestions: ['Provide a valid mathematical expression']
    };
  }
}

/**
 * Formats a numerical result for display
 * @param {number|string} result - The result to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted result
 */
function formatResult(result, options = {}) {
  try {
    const {
      precision = 10,
      notation = 'auto',
      removeTrailingZeros = true,
      thousandsSeparator = false
    } = options;

    if (result === null || result === undefined) {
      return 'No result';
    }

    if (typeof result === 'string') {
      return result;
    }

    if (typeof result === 'boolean') {
      return result.toString();
    }

    if (typeof result === 'object') {
      if (Array.isArray(result)) {
        return '[' + result.map(item => formatResult(item, options)).join(', ') + ']';
      }
      return JSON.stringify(result);
    }

    const num = Number(result);
    
    if (isNaN(num)) {
      return 'Invalid number';
    }

    if (!isFinite(num)) {
      return num > 0 ? 'Infinity' : num < 0 ? '-Infinity' : 'NaN';
    }

    let formatted;

    // Handle very large or very small numbers
    if (notation === 'exponential' || 
        (notation === 'auto' && (Math.abs(num) >= 1e10 || (Math.abs(num) < 1e-4 && num !== 0)))) {
      formatted = num.toExponential(precision);
    } else {
      formatted = num.toPrecision(precision);
    }

    // Remove trailing zeros if requested
    if (removeTrailingZeros && formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }

    // Add thousands separator if requested
    if (thousandsSeparator && !formatted.includes('e')) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    return formatted;
  } catch (error) {
    return 'Formatting error: ' + error.message;
  }
}

/**
 * Simple validation check for mathematical expressions
 * @param {string} expression - Expression to check
 * @returns {boolean} - True if valid
 */
function isValidMathExpression(expression) {
  const validation = validateExpression(expression);
  return validation.isValid;
}

/**
 * Sanitizes mathematical expression by removing potentially harmful content
 * @param {string} expression - Expression to sanitize
 * @returns {string} - Sanitized expression
 */
function sanitizeExpression(expression) {
  if (typeof expression !== 'string') {
    throw new Error('Expression must be a string');
  }

  // Remove any potential script tags or HTML
  let sanitized = expression.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous keywords
  const dangerousKeywords = [
    'import', 'require', 'eval', 'Function', 'constructor',
    'prototype', 'window', 'document', 'global', 'process'
  ];
  
  dangerousKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Checks if parentheses are balanced in an expression
 * @param {string} expression - Expression to check
 * @returns {boolean} - True if balanced
 */
function hasBalancedParentheses(expression) {
  let count = 0;
  for (let char of expression) {
    if (char === '(') {
      count++;
    } else if (char === ')') {
      count--;
      if (count < 0) {
        return false;
      }
    }
  }
  return count === 0;
}

module.exports = {
  evaluateExpression,
  validateExpression,
  formatResult,
  isValidMathExpression
};