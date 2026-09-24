const { evaluate, parse, format, typeOf, complex, re, im } = require('mathjs');
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
    const validation = validateExpression(sanitized);
    
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
      formatted: formatResult(result, options.format),
      expression: sanitized
    };
  } catch (error) {
    return {
      success: false,
      error: `Evaluation error: ${error.message}`,
      value: null,
      expression: expression
    };
  }
}

// Sanitize mathematical input to prevent injection attacks
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove potentially dangerous characters and patterns
  const sanitized = input
    .replace(/[^\w\s+\-*/().^,=<>!|&\[\]{}]/g, '')
    .trim();
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /import\s*\(/,
    /require\s*\(/,
    /eval\s*\(/,
    /function\s*\(/,
    /=>\s*{/,
    /process\./,
    /global\./,
    /window\./,
    /__proto__/,
    /constructor/
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Invalid characters or patterns detected');
    }
  }
  
  return sanitized;
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

  // Remove potentially dangerous keywords
  const dangerousKeywords = [
    'import', 'require', 'eval', 'Function', 'constructor',
    'prototype', 'window', 'document', 'global', 'process'
  ];
  
  dangerousKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

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

// Validate if a string is a valid mathematical expression
function isValidMathExpression(expression) {
  try {
    const sanitized = sanitizeInput(expression);
    parse(sanitized);
    return true;
  } catch (error) {
    return false;
  }
}

// Validate and parse mathematical expressions
function validateExpression(expression) {
  try {
    if (!expression || typeof expression !== 'string') {
      return {
        isValid: false,
        error: 'Expression must be a non-empty string',
        suggestions: ['Provide a valid mathematical expression']
      };
    }

    const sanitized = sanitizeInput(expression);
    
    if (!sanitized || sanitized.length === 0) {
      return {
        isValid: false,
        error: 'Expression cannot be empty',
        suggestions: ['Provide a valid mathematical expression']
      };
    }
    
    if (sanitized.length > 1000) {
      return {
        isValid: false,
        error: 'Expression too long',
        suggestions: ['Provide a shorter mathematical expression']
      };
    }

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
    
    // Parse the expression to check syntax
    const parsed = parse(sanitized);
    
    // Check for allowed functions and operations
    const allowedTypes = [
      'OperatorNode',
      'FunctionNode',
      'ConstantNode',
      'SymbolNode',
      'ParenthesesNode',
      'ArrayNode',
      'ObjectNode'
    ];
    
    function validateNode(node) {
      if (!allowedTypes.includes(node.type)) {
        throw new Error(`Unsupported node type: ${node.type}`);
      }
      
      if (node.type === 'FunctionNode') {
        const allowedFunctions = [
          'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
          'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
          'log', 'log10', 'log2', 'ln', 'exp', 'sqrt', 'cbrt',
          'abs', 'sign', 'ceil', 'floor', 'round', 'fix',
          'min', 'max', 'mean', 'median', 'mode', 'std', 'var',
          'sum', 'prod', 'gcd', 'lcm', 'factorial',
          'pow', 'mod', 'random', 'complex', 're', 'im', 'arg', 'conj'
        ];
        
        if (!allowedFunctions.includes(node.fn.name)) {
          throw new Error(`Function not allowed: ${node.fn.name}`);
        }
      }
      
      if (node.args) {
        node.args.forEach(validateNode);
      }
      if (node.content) {
        validateNode(node.content);
      }
      if (node.items) {
        node.items.forEach(validateNode);
      }
    }
    
    validateNode(parsed);
    
    return {
      isValid: true,
      parsed: parsed,
      sanitized: sanitized,
      error: null,
      suggestions: []
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      sanitized: null,
      suggestions: ['Check expression syntax']
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

// Format mathematical results for display
function formatResult(result, options = {}) {
  const {
    precision = 10,
    notation = 'auto',
    lowerExp = -3,
    upperExp = 5,
    removeTrailingZeros = true,
    thousandsSeparator = false,
    decimalSeparator = '.',
    currency = false,
    currencySymbol = '$',
    percentage = false
  } = options;
  
  try {
    if (result === null || result === undefined) {
      return 'undefined';
    }
    
    if (typeof result === 'boolean') {
      return result.toString();
    }
    
    if (typeof result === 'string') {
      return result;
    }

    // Handle BigNumber or regular number
    let numValue;
    if (math.isBigNumber && math.isBigNumber(result)) {
      numValue = result.toNumber();
    } else if (typeof result === 'object' && result.toString) {
      numValue = parseFloat(result.toString());
    } else {
      numValue = Number(result);
    }

    if (!isNaN(numValue)) {
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
      if (removeTrailingZeros) {
        formatted = formatted.replace(/\.?0+$/, '');
        formatted = formatted.replace(/\.?0+e/, 'e');
      }

      // Add thousands separator for regular notation
      if (thousandsSeparator && notation !== 'exponential' && !formatted.includes('e')) {
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join(decimalSeparator);
      }

      // Apply currency or percentage formatting
      if (percentage) {
        formatted = (numValue * 100).toFixed(2) + '%';
      } else if (currency) {
        formatted = currencySymbol + formatted;
      }

      return formatted;
    }
    
    // Handle complex numbers
    if (typeOf(result) === 'Complex') {
      const realPart = re(result);
      const imagPart = im(result);
      
      if (Math.abs(imagPart) < 1e-10) {
        return format(realPart, { precision, notation, lowerExp, upperExp });
      }
      
      const formattedReal = format(realPart, { precision, notation, lowerExp, upperExp });
      const formattedImag = format(Math.abs(imagPart), { precision, notation, lowerExp, upperExp });
      const sign = imagPart >= 0 ? '+' : '-';
      
      if (Math.abs(realPart) < 1e-10) {
        return `${imagPart < 0 ? '-' : ''}${formattedImag}i`;
      }
      
      return `${formattedReal} ${sign} ${formattedImag}i`;
    }
    
    // Handle arrays and matrices
    if (Array.isArray(result)) {
      return '[' + result.map(item => formatResult(item, options)).join(', ') + ']';
    }

    if (typeof result === 'object') {
      return JSON.stringify(result);
    }
    
    // Handle numbers
    if (typeof result === 'number') {
      if (!isFinite(result)) {
        return result.toString();
      }
      
      return format(result, { precision, notation, lowerExp, upperExp });
    }
    
    // Use mathjs format for other types
    return format(result, { precision, notation, lowerExp, upperExp });
  } catch (error) {
    return result.toString();
  }
}

/**
 * Formats a number according to specified options
 * @param {number|BigNumber} value - The number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 */
function formatNumber(value, options = {}) {
  return formatResult(value, options);
}

// Handle mathematical errors gracefully
function handleMathError(error) {
  const errorTypes = {
    'SyntaxError': 'Invalid mathematical syntax',
    'TypeError': 'Type error in mathematical operation',
    'RangeError': 'Value out of valid range',
    'EvalError': 'Evaluation error',
    'ReferenceError': 'Undefined variable or function'
  };
  
  let message = error.message;
  let type = 'MathError';
  
  // Classify error type
  for (const [errorType, description] of Object.entries(errorTypes)) {
    if (error.name === errorType || message.includes(errorType)) {
      type = errorType;
      message = description + ': ' + message;
      break;
    }
  }
  
  // Handle specific math.js errors
  if (message.includes('Unexpected type')) {
    type = 'TypeError';
    message = 'Invalid data type for mathematical operation';
  } else if (message.includes('Value out of range')) {
    type = 'RangeError';
    message = 'Mathematical result is out of valid range';
  } else if (message.includes('Cannot evaluate')) {
    type = 'EvalError';
    message = 'Unable to evaluate mathematical expression';
  }
  
  return {
    type: type,
    message: message,
    originalError: error.message,
    stack: error.stack
  };
}

// Parse complex numbers from string representation
function parseComplexNumber(input) {
  try {
    const sanitized = sanitizeInput(input);
    
    // Try to evaluate as complex number
    const result = evaluate(sanitized);
    
    if (typeOf(result) === 'Complex') {
      return {
        isValid: true,
        complex: result,
        real: re(result),
        imaginary: im(result),
        magnitude: Math.sqrt(re(result) ** 2 + im(result) ** 2),
        phase: Math.atan2(im(result), re(result))
      };
    } else if (typeof result === 'number') {
      return {
        isValid: true,
        complex: complex(result, 0),
        real: result,
        imaginary: 0,
        magnitude: Math.abs(result),
        phase: result < 0 ? Math.PI : 0
      };
    } else {
      throw new Error('Input is not a valid complex number');
    }
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      complex: null,
      real: null,
      imaginary: null,
      magnitude: null,
      phase: null
    };
  }
}

// Validate mathematical domains for specific operations
function validateDomain(operation, value) {
  try {
    const numValue = typeof value === 'number' ? value : evaluate(sanitizeInput(value.toString()));
    
    if (typeof numValue !== 'number') {
      throw new Error('Value must be a number');
    }
    
    const domainChecks = {
      'sqrt': (x) => x >= 0 || 'Square root requires non-negative value',
      'log': (x) => x > 0 || 'Logarithm requires positive value',
      'log10': (x) => x > 0 || 'Base-10 logarithm requires positive value',
      'ln': (x) => x > 0 || 'Natural logarithm requires positive value',
      'asin': (x) => x >= -1 && x <= 1 || 'Arcsine requires value between -1 and 1',
      'acos': (x) => x >= -1 && x <= 1 || 'Arccosine requires value between -1 and 1',
      'atan': (x) => true, // No domain restrictions
      'asinh': (x) => true, // No domain restrictions
      'acosh': (x) => x >= 1 || 'Inverse hyperbolic cosine requires value >= 1',
      'atanh': (x) => x > -1 && x < 1 || 'Inverse hyperbolic tangent requires -1 < x < 1',
      'factorial': (x) => Number.isInteger(x) && x >= 0 || 'Factorial requires non-negative integer',
      'divide': (x) => x !== 0 || 'Division by zero is not allowed',
      'mod': (x) => x !== 0 || 'Modulo by zero is not allowed'
    };
    
    if (!domainChecks[operation]) {
      return {
        isValid: true,
        message: 'No domain restrictions for this operation'
      };
    }
    
    const result = domainChecks[operation](numValue);
    
    if (result === true) {
      return {
        isValid: true,
        message: 'Value is within valid domain'
      };
    } else {
      return {
        isValid: false,
        message: result
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: 'Error validating domain: ' + error.message
    };
  }
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
  validateMathExpression,
  formatResult,
  formatNumber,
  handleMathError,
  sanitizeInput,
  sanitizeExpression,
  isValidMathExpression,
  parseComplexNumber,
  validateDomain
};
