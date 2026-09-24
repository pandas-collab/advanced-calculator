const { evaluate, parse, format, typeOf, complex, re, im } = require('mathjs');

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
    const sanitized = sanitizeInput(expression);
    
    if (!sanitized || sanitized.length === 0) {
      throw new Error('Expression cannot be empty');
    }
    
    if (sanitized.length > 1000) {
      throw new Error('Expression too long');
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
      sanitized: sanitized
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      sanitized: null
    };
  }
}

// Format mathematical results for display
function formatResult(result, options = {}) {
  const {
    precision = 10,
    notation = 'auto',
    lowerExp = -3,
    upperExp = 5
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
      return format(result, { precision, notation, lowerExp, upperExp });
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

module.exports = {
  validateExpression,
  sanitizeInput,
  formatResult,
  handleMathError,
  isValidMathExpression,
  parseComplexNumber,
  validateDomain
};