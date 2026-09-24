const math = require('mathjs');

/**
 * Evaluates a mathematical expression safely
 * @param {string} expression - The mathematical expression to evaluate
 * @param {Object} options - Configuration options for evaluation
 * @returns {Object} Result object with success status and value or error
 */
function evaluateExpression(expression, options = {}) {
  try {
    if (!expression || typeof expression !== 'string') {
      return {
        success: false,
        error: 'Invalid expression: must be a non-empty string',
        value: null
      };
    }

    const sanitized = sanitizeExpression(expression);
    const validation = validateMathExpression(sanitized);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        value: null
      };
    }

    const scope = options.scope || {};
    const precision = options.precision || 14;
    
    // Configure math.js with safe evaluation
    const mathConfig = math.create({
      number: 'BigNumber',
      precision: precision
    });

    const result = mathConfig.evaluate(sanitized, scope);
    
    return {
      success: true,
      error: null,
      value: result,
      formatted: formatNumber(result, options.format)
    };
  } catch (error) {
    return {
      success: false,
      error: `Evaluation error: ${error.message}`,
      value: null
    };
  }
}

/**
 * Validates a mathematical expression for safety and correctness
 * @param {string} expression - The expression to validate
 * @returns {Object} Validation result with isValid flag and error message
 */
function validateMathExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return {
      isValid: false,
      error: 'Expression must be a non-empty string'
    };
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /import\s*\(/i,
    /require\s*\(/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /=\s*>/i,
    /\bwhile\b/i,
    /\bfor\b/i,
    /\bif\b/i,
    /\{\s*\}/i,
    /\[\s*\]/i,
    /\.__/i,
    /prototype/i,
    /constructor/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(expression)) {
      return {
        isValid: false,
        error: 'Expression contains potentially unsafe operations'
      };
    }
  }

  // Check for balanced parentheses
  let balance = 0;
  for (const char of expression) {
    if (char === '(') balance++;
    if (char === ')') balance--;
    if (balance < 0) {
      return {
        isValid: false,
        error: 'Unbalanced parentheses'
      };
    }
  }
  
  if (balance !== 0) {
    return {
      isValid: false,
      error: 'Unbalanced parentheses'
    };
  }

  // Check for valid characters only
  const validPattern = /^[0-9+\-*/.()%^√π\se\s,\w\s]+$/;
  if (!validPattern.test(expression)) {
    return {
      isValid: false,
      error: 'Expression contains invalid characters'
    };
  }

  // Try to parse the expression
  try {
    math.parse(expression);
    return {
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Parse error: ${error.message}`
    };
  }
}

/**
 * Formats a number according to specified options
 * @param {number|BigNumber} value - The number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 */
function formatNumber(value, options = {}) {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    const {
      precision = 10,
      notation = 'auto',
      thousandsSeparator = ',',
      decimalSeparator = '.',
      currency = false,
      currencySymbol = '$',
      percentage = false
    } = options;

    let numValue;
    
    // Handle BigNumber or regular number
    if (math.isBigNumber && math.isBigNumber(value)) {
      numValue = value.toNumber();
    } else if (typeof value === 'object' && value.toString) {
      numValue = parseFloat(value.toString());
    } else {
      numValue = Number(value);
    }

    if (isNaN(numValue)) {
      return value.toString();
    }

    let formatted;
    
    if (notation === 'exponential') {
      formatted = numValue.toExponential(precision);
    } else if (notation === 'fixed') {
      formatted = numValue.toFixed(precision);
    } else {
      // Auto notation
      if (Math.abs(numValue) >= 1e6 || (Math.abs(numValue) < 0.001 && numValue !== 0)) {
        formatted = numValue.toExponential(precision);
      } else {
        formatted = numValue.toPrecision(precision);
      }
    }

    // Remove trailing zeros and unnecessary decimal point
    formatted = formatted.replace(/\.?0+$/, '');
    formatted = formatted.replace(/\.?0+e/, 'e');

    // Add thousands separator for regular notation
    if (notation !== 'exponential' && !formatted.includes('e')) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
      formatted = parts.join(decimalSeparator);
    }

    // Apply currency or percentage formatting
    if (percentage) {
      formatted = (numValue * 100).toFixed(2) + '%';
    } else if (currency) {
      formatted = currencySymbol + formatted;
    }

    return formatted;
  } catch (error) {
    return value.toString();
  }
}

/**
 * Sanitizes a mathematical expression by removing unsafe characters and patterns
 * @param {string} expression - The expression to sanitize
 * @returns {string} Sanitized expression
 */
function sanitizeExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters and patterns
  let sanitized = expression
    .replace(/[;<>{}[\]]/g, '') // Remove brackets and semicolons
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Replace common mathematical symbols with math.js equivalents
  sanitized = sanitized
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'Infinity')
    .replace(/\^/g, '^');

  // Ensure proper function syntax
  sanitized = sanitized
    .replace(/(\w+)\s*\(/g, '$1(')
    .replace(/\)\s*(\d)/g, ') * $1')
    .replace(/(\d)\s*\(/g, '$1 * (');

  return sanitized;
}

module.exports = {
  evaluateExpression,
  validateMathExpression,
  formatNumber,
  sanitizeExpression
};