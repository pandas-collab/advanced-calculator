const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Middleware for validation error handling
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Basic arithmetic calculations
router.post('/add', [
  body('a').isNumeric().withMessage('First number must be numeric'),
  body('b').isNumeric().withMessage('Second number must be numeric'),
  handleValidationErrors
], (req, res) => {
  try {
    const { a, b } = req.body;
    const result = parseFloat(a) + parseFloat(b);
    res.json({
      success: true,
      operation: 'addition',
      operands: [a, b],
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.post('/subtract', [
  body('a').isNumeric().withMessage('First number must be numeric'),
  body('b').isNumeric().withMessage('Second number must be numeric'),
  handleValidationErrors
], (req, res) => {
  try {
    const { a, b } = req.body;
    const result = parseFloat(a) - parseFloat(b);
    res.json({
      success: true,
      operation: 'subtraction',
      operands: [a, b],
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.post('/multiply', [
  body('a').isNumeric().withMessage('First number must be numeric'),
  body('b').isNumeric().withMessage('Second number must be numeric'),
  handleValidationErrors
], (req, res) => {
  try {
    const { a, b } = req.body;
    const result = parseFloat(a) * parseFloat(b);
    res.json({
      success: true,
      operation: 'multiplication',
      operands: [a, b],
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.post('/divide', [
  body('a').isNumeric().withMessage('First number must be numeric'),
  body('b').isNumeric().withMessage('Second number must be numeric'),
  body('b').custom(value => {
    if (parseFloat(value) === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return true;
  }),
  handleValidationErrors
], (req, res) => {
  try {
    const { a, b } = req.body;
    const result = parseFloat(a) / parseFloat(b);
    res.json({
      success: true,
      operation: 'division',
      operands: [a, b],
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Advanced calculations
router.post('/power', [
  body('base').isNumeric().withMessage('Base must be numeric'),
  body('exponent').isNumeric().withMessage('Exponent must be numeric'),
  handleValidationErrors
], (req, res) => {
  try {
    const { base, exponent } = req.body;
    const result = Math.pow(parseFloat(base), parseFloat(exponent));
    res.json({
      success: true,
      operation: 'power',
      operands: { base, exponent },
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.post('/sqrt', [
  body('number').isNumeric().withMessage('Number must be numeric'),
  body('number').custom(value => {
    if (parseFloat(value) < 0) {
      throw new Error('Cannot calculate square root of negative number');
    }
    return true;
  }),
  handleValidationErrors
], (req, res) => {
  try {
    const { number } = req.body;
    const result = Math.sqrt(parseFloat(number));
    res.json({
      success: true,
      operation: 'square_root',
      operands: [number],
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Batch calculations
router.post('/batch', [
  body('operations').isArray().withMessage('Operations must be an array'),
  body('operations.*.operation').isIn(['add', 'subtract', 'multiply', 'divide']).withMessage('Invalid operation'),
  body('operations.*.a').isNumeric().withMessage('First operand must be numeric'),
  body('operations.*.b').isNumeric().withMessage('Second operand must be numeric'),
  handleValidationErrors
], (req, res) => {
  try {
    const { operations } = req.body;
    const results = operations.map((op, index) => {
      const a = parseFloat(op.a);
      const b = parseFloat(op.b);
      let result;

      switch (op.operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            return {
              index,
              success: false,
              error: 'Division by zero'
            };
          }
          result = a / b;
          break;
        default:
          return {
            index,
            success: false,
            error: 'Invalid operation'
          };
      }

      return {
        index,
        success: true,
        operation: op.operation,
        operands: [a, b],
        result
      };
    });

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get calculation history (placeholder for future database integration)
router.get('/history', (req, res) => {
  res.json({
    success: true,
    message: 'History endpoint - to be implemented with database',
    data: []
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Calculations API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;