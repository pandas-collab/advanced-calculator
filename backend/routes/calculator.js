const express = require('express');
const router = express.Router();

// In-memory storage for calculation history
let calculationHistory = [];

// Basic arithmetic operations
const operations = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
};

// POST /api/calculator/calculate
router.post('/calculate', (req, res) => {
  try {
    const { operation, operand1, operand2 } = req.body;
    
    // Validate input
    if (!operation || operand1 === undefined || operand2 === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operation, operand1, operand2'
      });
    }

    if (!operations[operation]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Supported: add, subtract, multiply, divide'
      });
    }

    const num1 = parseFloat(operand1);
    const num2 = parseFloat(operand2);

    if (isNaN(num1) || isNaN(num2)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operands. Must be numbers'
      });
    }

    // Perform calculation
    const result = operations[operation](num1, num2);
    
    // Store in history
    const calculation = {
      id: Date.now(),
      operation,
      operand1: num1,
      operand2: num2,
      result,
      timestamp: new Date().toISOString()
    };
    
    calculationHistory.unshift(calculation);
    
    // Keep only last 100 calculations
    if (calculationHistory.length > 100) {
      calculationHistory = calculationHistory.slice(0, 100);
    }

    res.json({
      success: true,
      data: calculation
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/calculator/history
router.get('/history', (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    const paginatedHistory = calculationHistory.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: {
        calculations: paginatedHistory,
        total: calculationHistory.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history'
    });
  }
});

// DELETE /api/calculator/history
router.delete('/history', (req, res) => {
  try {
    calculationHistory = [];
    res.json({
      success: true,
      message: 'History cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear history'
    });
  }
});

// GET /api/calculator/history/:id
router.get('/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const calculation = calculationHistory.find(calc => calc.id === parseInt(id));
    
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

// POST /api/calculator/evaluate
router.post('/evaluate', (req, res) => {
  try {
    const { expression } = req.body;
    
    if (!expression) {
      return res.status(400).json({
        success: false,
        error: 'Expression is required'
      });
    }

    // Simple expression validation (only allow numbers, operators, and parentheses)
    const validExpression = /^[0-9+\-*/().\s]+$/.test(expression);
    
    if (!validExpression) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expression format'
      });
    }

    // Evaluate the expression safely
    const result = Function('"use strict"; return (' + expression + ')')();
    
    if (!isFinite(result)) {
      throw new Error('Result is not a finite number');
    }

    // Store in history
    const calculation = {
      id: Date.now(),
      expression,
      result,
      timestamp: new Date().toISOString()
    };
    
    calculationHistory.unshift(calculation);
    
    if (calculationHistory.length > 100) {
      calculationHistory = calculationHistory.slice(0, 100);
    }

    res.json({
      success: true,
      data: calculation
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid expression: ' + error.message
    });
  }
});

module.exports = router;