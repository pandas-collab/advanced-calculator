const { validationResult, body } = require('express-validator');

const validateExpression = [
  body('expression')
    .notEmpty()
    .withMessage('Expression is required')
    .isString()
    .withMessage('Expression must be a string')
    .matches(/^[0-9+\-*/.() ]+$/)
    .withMessage('Expression contains invalid characters')
    .isLength({ max: 1000 })
    .withMessage('Expression is too long'),
];

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

    const { expression } = req.body;

    // Sanitize expression
    const sanitizedExpression = expression.replace(/\s+/g, '');

    // Validate parentheses balance
    if (!isParenthesesBalanced(sanitizedExpression)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expression: unbalanced parentheses'
      });
    }

    // Validate expression structure
    if (!isValidMathExpression(sanitizedExpression)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mathematical expression'
      });
    }

    // Perform calculation
    const result = evaluateExpression(sanitizedExpression);

    // Check for invalid results
    if (!isFinite(result)) {
      return res.status(400).json({
        success: false,
        error: 'Calculation resulted in invalid number'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        expression: expression,
        result: result
      }
    });

  } catch (error) {
    console.error('Calculation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during calculation'
    });
  }
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
  // Replace division by zero protection
  const protectedExpression = expression.replace(/\/0(?!\d)/g, '/0.000000001');
  
  try {
    // Use Function constructor for safe evaluation
    return Function(`"use strict"; return (${protectedExpression})`)();
  } catch (error) {
    throw new Error('Invalid expression');
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
  memoryStore,
  memoryRecall,
  memoryClear,
  calculate,
  validateExpression
};