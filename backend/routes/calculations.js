const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

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

// POST /calculations/batch - Perform multiple calculations
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { calculations } = req.body;
    
    if (!calculations || !Array.isArray(calculations)) {
      return res.status(400).json({
        success: false,
        error: 'Calculations array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < calculations.length; i++) {
      const calc = calculations[i];
      
      try {
        if (!calc.operation || !calc.operands) {
          errors.push({
            index: i,
            error: 'Operation and operands are required'
          });
          continue;
        }
        
        const result = performCalculation(calc.operation, calc.operands);
        results.push({
          index: i,
          operation: calc.operation,
          operands: calc.operands,
          result,
          timestamp: new Date().toISOString()
        });
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

module.exports = router;