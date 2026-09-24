const { body, validationResult } = require('express-validator');

// In-memory storage for calculator memory operations
let memoryStorage = {
  value: 0,
  history: []
};

// Basic mathematical operations
const operations = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  },
  '%': (a, b) => a % b,
  '^': (a, b) => Math.pow(a, b),
  'sqrt': (a) => Math.sqrt(a),
  'sin': (a) => Math.sin(a),
  'cos': (a) => Math.cos(a),
  'tan': (a) => Math.tan(a),
  'log': (a) => Math.log10(a),
  'ln': (a) => Math.log(a)
};

// Memory operations
const memoryOperations = {
  'MS': (value) => {
    memoryStorage.value = value;
    memoryStorage.history.push({ operation: 'MS', value, timestamp: new Date() });
    return memoryStorage.value;
  },
  'MR': () => {
    memoryStorage.history.push({ operation: 'MR', value: memoryStorage.value, timestamp: new Date() });
    return memoryStorage.value;
  },
  'MC': () => {
    memoryStorage.value = 0;
    memoryStorage.history.push({ operation: 'MC', value: 0, timestamp: new Date() });
    return 0;
  },
  'M+': (value) => {
    memoryStorage.value += value;
    memoryStorage.history.push({ operation: 'M+', value: memoryStorage.value, timestamp: new Date() });
    return memoryStorage.value;
  },
  'M-': (value) => {
    memoryStorage.value -= value;
    memoryStorage.history.push({ operation: 'M-', value: memoryStorage.value, timestamp: new Date() });
    return memoryStorage.value;
  }
};

const validateExpression = (expression) => {
  if (!expression || typeof expression !== 'string') {
    return { isValid: false, error: 'Expression must be a non-empty string' };
  }

  // Remove whitespace
  const cleanExpression = expression.replace(/\s/g, '');

  // Check for valid characters
  const validChars = /^[0-9+\-*/.()%^√sincotanlgπe\s]+$/i;
  if (!validChars.test(cleanExpression)) {
    return { isValid: false, error: 'Expression contains invalid characters' };
  }

  // Check for balanced parentheses
  let parenthesesCount = 0;
  for (let char of cleanExpression) {
    if (char === '(') parenthesesCount++;
    if (char === ')') parenthesesCount--;
    if (parenthesesCount < 0) {
      return { isValid: false, error: 'Unbalanced parentheses' };
    }
  }

  if (parenthesesCount !== 0) {
    return { isValid: false, error: 'Unbalanced parentheses' };
  }

  // Check for consecutive operators
  const consecutiveOperators = /[+\-*/^%]{2,}/;
  if (consecutiveOperators.test(cleanExpression)) {
    return { isValid: false, error: 'Invalid operator sequence' };
  }

  // Check for operators at start or end (except minus at start)
  if (/[+*/^%]$/.test(cleanExpression) || /^[+*/^%]/.test(cleanExpression)) {
    return { isValid: false, error: 'Expression cannot start or end with operator' };
  }

  return { isValid: true };
};

const isParenthesesBalanced = (expression) => {
  let count = 0;
  for (const char of expression) {
    if (char === '(') count++;
    if (char === ')') count--;
    if (count < 0) return false;
  }
  return count === 0;
};

const isValidMathExpression = (expression) => {
  // Check for consecutive operators
  if (/[+\-*/]{2,}/.test(expression)) return false;
  
  // Check for operators at start/end (except minus at start)
  if (/^[+*/]/.test(expression) || /[+\-*/]$/.test(expression)) return false;
  
  // Check for empty parentheses
  if (/\(\)/.test(expression)) return false;
  
  // Check for operators after opening parentheses (except minus)
  if (/\([+*/]/.test(expression)) return false;
  
  // Check for operators before closing parentheses
  if (/[+\-*/]\)/.test(expression)) return false;
  
  return true;
};

const evaluateExpression = (expression) => {
  try {
    // Replace mathematical constants
    let processedExpression = expression
      .replace(/π|pi/gi, Math.PI.toString())
      .replace(/e/g, Math.E.toString());

    // Handle mathematical functions
    processedExpression = processedExpression
      .replace(/sqrt\(([^)]+)\)/g, (match, num) => Math.sqrt(parseFloat(num)))
      .replace(/sin\(([^)]+)\)/g, (match, num) => Math.sin(parseFloat(num)))
      .replace(/cos\(([^)]+)\)/g, (match, num) => Math.cos(parseFloat(num)))
      .replace(/tan\(([^)]+)\)/g, (match, num) => Math.tan(parseFloat(num)))
      .replace(/log\(([^)]+)\)/g, (match, num) => Math.log10(parseFloat(num)))
      .replace(/ln\(([^)]+)\)/g, (match, num) => Math.log(parseFloat(num)));

    // Handle power operator
    processedExpression = processedExpression.replace(/\^/g, '**');

    // Safely evaluate the expression
    const result = Function('"use strict"; return (' + processedExpression + ')')();
    
    if (!isFinite(result)) {
      throw new Error('Result is not a finite number');
    }

    return result;
  } catch (error) {
    throw new Error('Invalid mathematical expression');
  }
};

const calculate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { expression, memoryOperation, value } = req.body;

    // Handle memory operations
    if (memoryOperation) {
      if (!memoryOperations[memoryOperation]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid memory operation'
        });
      }

      let result;
      if (['MS', 'M+', 'M-'].includes(memoryOperation)) {
        if (value === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Value required for memory operation'
          });
        }
        result = memoryOperations[memoryOperation](parseFloat(value));
      } else {
        result = memoryOperations[memoryOperation]();
      }

      return res.status(200).json({
        success: true,
        result,
        memoryValue: memoryStorage.value,
        operation: memoryOperation
      });
    }

    // Handle mathematical expression
    if (!expression) {
      return res.status(400).json({
        success: false,
        error: 'Expression is required'
      });
    }

    const validation = validateExpression(expression);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = evaluateExpression(expression);

    res.status(200).json({
      success: true,
      expression,
      result,
      memoryValue: memoryStorage.value
    });

  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during calculation'
    });
  }
};

const getMemoryOperations = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      memoryValue: memoryStorage.value,
      history: memoryStorage.history.slice(-20), // Return last 20 operations
      availableOperations: Object.keys(memoryOperations)
    });
  } catch (error) {
    console.error('Memory operations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving memory operations'
    });
  }
};

// Memory operations
const memoryStore = (req, res) => {
  try {
    const { value } = req.body;
    if (typeof value !== "number") {
      return res.status(400).json({ error: "Invalid value for memory storage" });
    }
    // Store in session or database
    req.session = req.session || {};
    req.session.memory = value;
    res.json({ message: "Value stored in memory", value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const memoryRecall = (req, res) => {
  try {
    const value = req.session?.memory || 0;
    res.json({ value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const memoryClear = (req, res) => {
  try {
    if (req.session) {
      req.session.memory = 0;
    }
    res.json({ message: "Memory cleared", value: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  calculate,
  validateExpression,
  getMemoryOperations,
  memoryStore,
  memoryRecall,
  memoryClear,
  isParenthesesBalanced,
  isValidMathExpression,
  evaluateExpression,
  operations,
  memoryOperations
};
