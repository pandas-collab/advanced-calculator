const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Input validation middleware
const validateCalculationInput = (req, res, next) => {
  const { operation, operands } = req.body;
  
  if (!operation) {
    return res.status(400).json({ error: 'Operation is required' });
  }
  
  if (!operands || !Array.isArray(operands) || operands.length === 0) {
    return res.status(400).json({ error: 'Operands array is required and must not be empty' });
  }
  
  // Check if all operands are numbers
  const invalidOperands = operands.filter(op => typeof op !== 'number' || isNaN(op));
  if (invalidOperands.length > 0) {
    return res.status(400).json({ error: 'All operands must be valid numbers' });
  }
  
  next();
};

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

// Basic arithmetic operations
const performCalculation = (operation, operands) => {
  switch (operation.toLowerCase()) {
    case 'add':
    case 'addition':
      return operands.reduce((sum, num) => sum + num, 0);
    
    case 'subtract':
    case 'subtraction':
      if (operands.length < 2) throw new Error('Subtraction requires at least 2 operands');
      return operands.reduce((diff, num, index) => index === 0 ? num : diff - num);
    
    case 'multiply':
    case 'multiplication':
      return operands.reduce((product, num) => product * num, 1);
    
    case 'divide':
    case 'division':
      if (operands.length < 2) throw new Error('Division requires at least 2 operands');
      const result = operands.reduce((quotient, num, index) => {
        if (index === 0) return num;
        if (num === 0) throw new Error('Division by zero is not allowed');
        return quotient / num;
      });
      return result;
    
    case 'power':
    case 'exponentiation':
      if (operands.length !== 2) throw new Error('Power operation requires exactly 2 operands');
      return Math.pow(operands[0], operands[1]);
    
    case 'sqrt':
    case 'square_root':
      if (operands.length !== 1) throw new Error('Square root requires exactly 1 operand');
      if (operands[0] < 0) throw new Error('Cannot calculate square root of negative number');
      return Math.sqrt(operands[0]);
    
    case 'percentage':
      if (operands.length !== 2) throw new Error('Percentage calculation requires exactly 2 operands (value, percentage)');
      return (operands[0] * operands[1]) / 100;
    
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
};

// GET /calculations - Get calculation history
router.get('/', authenticateToken, async (req, res) => {
  try {
    // In a real application, this would fetch from a database
    // For now, return a mock response
    const calculations = [
      {
        id: 1,
        operation: 'add',
        operands: [10, 20],
        result: 30,
        timestamp: new Date().toISOString(),
        userId: req.user.id
      }
    ];
    
    res.json({
      success: true,
      data: calculations,
      count: calculations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve calculation history'
    });
  }
});

// POST /calculations - Perform a new calculation
router.post('/', authenticateToken, validateCalculationInput, async (req, res) => {
  try {
    const { operation, operands, description } = req.body;
    
    const result = performCalculation(operation, operands);
    
    const calculationRecord = {
      id: Date.now(), // In production, use proper ID generation
      operation,
      operands,
      result,
      description: description || null,
      timestamp: new Date().toISOString(),
      userId: req.user.id
    };
    
    // In a real application, save to database here
    
    res.status(201).json({
      success: true,
      data: calculationRecord,
      message: 'Calculation completed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /calculations/:id - Get specific calculation
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real application, fetch from database
    const calculation = {
      id: parseInt(id),
      operation: 'multiply',
      operands: [5, 10],
      result: 50,
      timestamp: new Date().toISOString(),
      userId: req.user.id
    };
    
    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Calculation not found'
      });
    }
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve calculation'
    });
  }
});

// DELETE /calculations/:id - Delete specific calculation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real application, delete from database
    // Check if calculation exists and belongs to user
    
    res.json({
      success: true,
      message: 'Calculation deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete calculation'
    });
  }
});

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

// POST /calculations/batch - Perform multiple calculations
router.post('/batch', authenticateToken, [
  body('operations').isArray().withMessage('Operations must be an array'),
  body('operations.*.operation').isIn(['add', 'subtract', 'multiply', 'divide']).withMessage('Invalid operation'),
  body('operations.*.a').isNumeric().withMessage('First operand must be numeric'),
  body('operations.*.b').isNumeric().withMessage('Second operand must be numeric'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { operations, calculations } = req.body;
    
    // Handle both old format (calculations) and new format (operations)
    const operationsToProcess = operations || calculations;
    
    if (!operationsToProcess || !Array.isArray(operationsToProcess)) {
      return res.status(400).json({
        success: false,
        error: 'Operations or calculations array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < operationsToProcess.length; i++) {
      const op = operationsToProcess[i];
      
      try {
        let result;
        
        // Handle new format with operations array
        if (op.operation && op.a !== undefined && op.b !== undefined) {
          const a = parseFloat(op.a);
          const b = parseFloat(op.b);
          
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
                errors.push({
                  index: i,
                  error: 'Division by zero'
                });
                continue;
              }
              result = a / b;
              break;
            default:
              errors.push({
                index: i,
                error: 'Invalid operation'
              });
              continue;
          }
          
          results.push({
            index: i,
            success: true,
            operation: op.operation,
            operands: [a, b],
            result
          });
        }
        // Handle old format with calculations array
        else if (op.operation && op.operands) {
          result = performCalculation(op.operation, op.operands);
          results.push({
            index: i,
            operation: op.operation,
            operands: op.operands,
            result,
            timestamp: new Date().toISOString()
          });
        } else {
          errors.push({
            index: i,
            error: 'Operation and operands are required'
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        results,
        errors,
        processed: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process batch calculations'
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
