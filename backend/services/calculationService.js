const math = require('mathjs');
const Database = require('../database/connection');
const { Calculator } = require('../utils/mathOperations');
const Calculation = require('../models/Calculation');
const History = require('../models/History');
const crypto = require('crypto');

class CalculationError extends Error {
  constructor(message, code = 'CALCULATION_ERROR') {
    super(message);
    this.name = 'CalculationError';
    this.code = code;
  }
}

const ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '.', ' '];
const ALLOWED_FUNCTIONS = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs', 'pow', 'PI', 'E'];
const MAX_EXPRESSION_LENGTH = 1000;
const MAX_DECIMAL_PLACES = 10;

const calculationHistory = new Map();

class CalculationService {
  constructor(database = null) {
    this.db = database || Database;
    this.mathScope = {};
    this.initializeMathScope();
  }

  initializeMathScope() {
    // Initialize custom functions and constants
    this.mathScope = {
      // Add custom mathematical functions if needed
      ...math.all()
    };
  }

  async evaluateExpression(expression, mode = 'basic', userId = null) {
    try {
      const validatedExpression = this.validateCalculationInput(expression, mode);
      
      let result;
      switch (mode) {
        case 'basic':
          result = this.evaluateBasicExpression(validatedExpression);
          break;
        case 'scientific':
          result = this.evaluateScientificExpression(validatedExpression);
          break;
        case 'statistical':
          result = this.evaluateStatisticalExpression(validatedExpression);
          break;
        default:
          throw new Error(`Unsupported calculation mode: ${mode}`);
      }

      // Store calculation in history if userId provided
      if (userId) {
        await this.storeCalculationHistory(userId, expression, result, mode);
      }

      return {
        success: true,
        result: result,
        expression: expression,
        mode: mode
      };

    } catch (error) {
      return {
        success: false,
        error: this.formatMathError(error),
        expression: expression,
        mode: mode
      };
    }
  }

  evaluateBasicExpression(expression) {
    // Restrict to basic mathematical operations
    const allowedFunctions = ['add', 'subtract', 'multiply', 'divide', 'mod', 'pow', 'sqrt', 'abs'];
    const scope = this.createRestrictedScope(allowedFunctions);
    
    return math.evaluate(expression, scope);
  }

  evaluateScientificExpression(expression) {
    // Allow scientific functions
    const allowedFunctions = [
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
      'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
      'log', 'log10', 'log2', 'exp', 'pow', 'sqrt', 'cbrt',
      'abs', 'ceil', 'floor', 'round', 'sign',
      'pi', 'e', 'tau', 'phi',
      'factorial', 'gamma', 'combinations', 'permutations'
    ];
    const scope = this.createRestrictedScope(allowedFunctions);
    
    return math.evaluate(expression, scope);
  }

  evaluateStatisticalExpression(expression) {
    // Allow statistical functions
    const allowedFunctions = [
      'mean', 'median', 'mode', 'std', 'var', 'min', 'max',
      'sum', 'prod', 'count', 'quantileSeq', 'mad',
      'random', 'randomInt', 'pickRandom',
      'add', 'subtract', 'multiply', 'divide', 'pow', 'sqrt', 'abs'
    ];
    const scope = this.createRestrictedScope(allowedFunctions);
    
    return math.evaluate(expression, scope);
  }

  createRestrictedScope(allowedFunctions) {
    const scope = {};
    allowedFunctions.forEach(func => {
      if (math[func]) {
        scope[func] = math[func];
      }
    });
    return scope;
  }

  validateCalculationInput(expression, mode = 'basic') {
    if (!expression || typeof expression !== 'string') {
      if (mode === 'basic') {
        throw new Error('Expression must be a non-empty string');
      } else {
        throw new CalculationError('Expression must be a non-empty string', 'INVALID_INPUT');
      }
    }

    if (expression.length > MAX_EXPRESSION_LENGTH) {
      throw new CalculationError(`Expression too long. Maximum ${MAX_EXPRESSION_LENGTH} characters allowed`, 'EXPRESSION_TOO_LONG');
    }

    // Remove whitespace
    const cleanExpression = expression.trim();
    
    if (cleanExpression.length === 0) {
      if (mode === 'basic') {
        throw new Error('Expression cannot be empty');
      } else {
        throw new CalculationError('Expression cannot be empty', 'EMPTY_EXPRESSION');
      }
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /import\s*\(/i,
      /require\s*\(/i,
      /eval\s*\(/i,
      /function\s*\(/i,
      /=>/,
      /\bwhile\b/i,
      /\bfor\b/i,
      /\bif\b/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(cleanExpression)) {
        throw new Error('Expression contains prohibited syntax');
      }
    }

    // Enhanced validation for security
    const allowedPattern = /^[0-9+\-*/.() \t\n\r]+$/;
    if (!allowedPattern.test(cleanExpression)) {
      for (const func of ALLOWED_FUNCTIONS) {
        if (cleanExpression.includes(func)) {
          continue;
        }
      }
      
      const invalidChars = cleanExpression.match(/[^0-9+\-*/.() \t\n\r]/g);
      if (invalidChars) {
        const uniqueInvalidChars = [...new Set(invalidChars)];
        let hasValidFunction = false;
        
        for (const func of ALLOWED_FUNCTIONS) {
          if (cleanExpression.includes(func)) {
            hasValidFunction = true;
            break;
          }
        }
        
        if (!hasValidFunction) {
          throw new CalculationError(`Invalid characters detected: ${uniqueInvalidChars.join(', ')}`, 'INVALID_CHARACTERS');
        }
      }
    }

    const openParens = (cleanExpression.match(/\(/g) || []).length;
    const closeParens = (cleanExpression.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      throw new CalculationError('Mismatched parentheses', 'MISMATCHED_PARENTHESES');
    }

    if (/[+\-*/]{2,}/.test(cleanExpression.replace(/\s/g, ''))) {
      throw new CalculationError('Invalid operator sequence', 'INVALID_OPERATORS');
    }

    if (/[+\-*/]$/.test(cleanExpression.trim())) {
      throw new CalculationError('Expression cannot end with an operator', 'TRAILING_OPERATOR');
    }

    // Validate based on mode
    switch (mode) {
      case 'basic':
        this.validateBasicExpression(cleanExpression);
        break;
      case 'scientific':
        this.validateScientificExpression(cleanExpression);
        break;
      case 'statistical':
        this.validateStatisticalExpression(cleanExpression);
        break;
    }

    return cleanExpression;
  }

  validateBasicExpression(expression) {
    // Allow only basic mathematical operators and numbers
    const basicPattern = /^[0-9+\-*/().\s,sqrt()abs()pow()mod()]+$/i;
    if (!basicPattern.test(expression.replace(/sqrt|abs|pow|mod/gi, ''))) {
      throw new Error('Expression contains invalid characters for basic mode');
    }
  }

  validateScientificExpression(expression) {
    // More permissive validation for scientific functions
    const scientificFunctions = [
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
      'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
      'log', 'log10', 'log2', 'exp', 'pow', 'sqrt', 'cbrt',
      'abs', 'ceil', 'floor', 'round', 'sign',
      'pi', 'e', 'tau', 'phi', 'factorial', 'gamma'
    ];
    
    // This is a simplified validation - in production, you might want more sophisticated parsing
    return true;
  }

  validateStatisticalExpression(expression) {
    // Validation for statistical expressions
    const statisticalFunctions = [
      'mean', 'median', 'mode', 'std', 'var', 'min', 'max',
      'sum', 'prod', 'count', 'quantileSeq', 'mad', 'random'
    ];
    
    return true;
  }

  async performCalculation(calculationData) {
    const { expression, mode = 'basic', userId, metadata = {} } = calculationData;
    
    try {
      const result = await this.evaluateExpression(expression, mode, userId);
      
      if (result.success && userId) {
        await this.storeCalculationHistory(userId, expression, result.result, mode, metadata);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Calculation failed: ${error.message}`);
    }
  }

  async getCalculationHistory(userId, limit = 50, offset = 0) {
    try {
      if (!this.db) {
        return [];
      }

      const query = `
        SELECT id, expression, result, mode, metadata, created_at
        FROM calculation_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const history = await this.db.query(query, [userId, limit, offset]);
      
      return history.map(record => ({
        id: record.id,
        expression: record.expression,
        result: JSON.parse(record.result),
        mode: record.mode,
        metadata: JSON.parse(record.metadata || '{}'),
        createdAt: record.created_at
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve calculation history: ${error.message}`);
    }
  }

  async storeCalculationHistory(userId, expression, result, mode, metadata = {}) {
    try {
      if (!this.db) {
        return;
      }

      const query = `
        INSERT INTO calculation_history (user_id, expression, result, mode, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `;
      
      await this.db.query(query, [
        userId,
        expression,
        JSON.stringify(result),
        mode,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      console.error('Failed to store calculation history:', error);
      // Don't throw - history storage shouldn't break calculations
    }
  }

  formatMathError(error) {
    const errorMessage = error.message || 'Unknown mathematical error';
    
    // Map common Math.js errors to user-friendly messages
    const errorMappings = {
      'Undefined symbol': 'Unknown function or variable used',
      'Unexpected type of argument': 'Invalid input type for mathematical operation',
      'Division by zero': 'Cannot divide by zero',
      'Value out of range': 'Input value is outside the valid range',
      'Cannot parse expression': 'Invalid mathematical expression syntax'
    };

    for (const [mathError, userError] of Object.entries(errorMappings)) {
      if (errorMessage.includes(mathError)) {
        return userError;
      }
    }

    return errorMessage;
  }

  // Utility methods for specific mathematical operations
  async calculateStatistics(data) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be a non-empty array');
      }

      return {
        mean: math.mean(data),
        median: math.median(data),
        mode: math.mode(data),
        std: math.std(data),
        variance: math.var(data),
        min: math.min(data),
        max: math.max(data),
        sum: math.sum(data),
        count: data.length
      };
    } catch (error) {
      throw new Error(`Statistical calculation failed: ${error.message}`);
    }
  }

  clearHistory(userId) {
    if (!this.db || !userId) {
      return Promise.resolve();
    }

    const query = 'DELETE FROM calculation_history WHERE user_id = ?';
    return this.db.query(query, [userId]);
  }
}

function safeEvaluate(expression) {
  try {
    const sanitizedExpression = expression
      .replace(/\s/g, '')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/log/g, 'Math.log10')
      .replace(/ln/g, 'Math.log')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/pow/g, 'Math.pow')
      .replace(/PI/g, 'Math.PI')
      .replace(/E/g, 'Math.E');

    const allowedPattern = /^[0-9+\-*/.()Math \t\n\r]+$/;
    if (!allowedPattern.test(sanitizedExpression)) {
      throw new CalculationError('Invalid expression after sanitization', 'SANITIZATION_ERROR');
    }

    const result = Function(`"use strict"; return (${sanitizedExpression})`)();

    if (typeof result !== 'number') {
      throw new CalculationError('Expression did not evaluate to a number', 'NON_NUMERIC_RESULT');
    }

    if (!isFinite(result)) {
      if (isNaN(result)) {
        throw new CalculationError('Calculation resulted in NaN (Not a Number)', 'NAN_RESULT');
      } else {
        throw new CalculationError('Calculation resulted in infinity', 'INFINITY_RESULT');
      }
    }

    return result;
  } catch (error) {
    if (error instanceof CalculationError) {
      throw error;
    }
    throw new CalculationError(`Evaluation error: ${error.message}`, 'EVALUATION_ERROR');
  }
}

function formatResult(result) {
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new CalculationError('Cannot format invalid result', 'FORMAT_ERROR');
  }

  if (Number.isInteger(result)) {
    return result.toString();
  }

  const fixed = parseFloat(result.toFixed(MAX_DECIMAL_PLACES));
  
  if (Math.abs(result) < 1e-10) {
    return '0';
  }
  
  if (Math.abs(result) >= 1e15 || Math.abs(result) < 1e-4) {
    return result.toExponential(6);
  }

  return fixed.toString();
}

function generateCalculationId() {
  return crypto.randomBytes(16).toString('hex');
}

async function saveCalculationResult(expression, result, formattedResult) {
  try {
    const calculationId = generateCalculationId();
    const timestamp = new Date().toISOString();
    
    const calculationRecord = {
      id: calculationId,
      expression: expression,
      result: result,
      formattedResult: formattedResult,
      timestamp: timestamp,
      status: 'completed'
    };

    calculationHistory.set(calculationId, calculationRecord);

    if (calculationHistory.size > 1000) {
      const oldestKey = calculationHistory.keys().next().value;
      calculationHistory.delete(oldestKey);
    }

    return {
      success: true,
      calculationId: calculationId,
      savedAt: timestamp
    };
  } catch (error) {
    throw new CalculationError(`Failed to save calculation: ${error.message}`, 'SAVE_ERROR');
  }
}

/**
 * Validates calculation input parameters for operands-based calculations
 * @param {Object} input - The calculation input object
 * @param {string} input.operation - The mathematical operation
 * @param {Array} input.operands - Array of numbers to operate on
 * @returns {Object} Validation result with isValid boolean and errors array
 */
const validateCalculationInputOperands = (input) => {
  const errors = [];
  
  if (!input || typeof input !== 'object') {
    errors.push('Input must be a valid object');
    return { isValid: false, errors };
  }

  const { operation, operands } = input;

  // Validate operation
  if (!operation || typeof operation !== 'string') {
    errors.push('Operation is required and must be a string');
  } else {
    const validOperations = ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt'];
    if (!validOperations.includes(operation.toLowerCase())) {
      errors.push(`Invalid operation. Supported operations: ${validOperations.join(', ')}`);
    }
  }

  // Validate operands
  if (!Array.isArray(operands)) {
    errors.push('Operands must be an array');
  } else if (operands.length === 0) {
    errors.push('At least one operand is required');
  } else {
    // Check if all operands are numbers
    const invalidOperands = operands.filter(operand => typeof operand !== 'number' || isNaN(operand));
    if (invalidOperands.length > 0) {
      errors.push('All operands must be valid numbers');
    }

    // Operation-specific validation
    if (operation) {
      switch (operation.toLowerCase()) {
        case 'divide':
          if (operands.length >= 2 && operands.slice(1).some(operand => operand === 0)) {
            errors.push('Division by zero is not allowed');
          }
          break;
        case 'sqrt':
          if (operands.length !== 1) {
            errors.push('Square root operation requires exactly one operand');
          } else if (operands[0] < 0) {
            errors.push('Square root of negative number is not supported');
          }
          break;
        case 'power':
          if (operands.length !== 2) {
            errors.push('Power operation requires exactly two operands');
          }
          break;
        case 'add':
        case 'subtract':
        case 'multiply':
          if (operands.length < 2) {
            errors.push(`${operation} operation requires at least two operands`);
          }
          break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Processes a calculation request with operands
 * @param {Object} calculationData - The calculation data
 * @param {string} calculationData.operation - The mathematical operation
 * @param {Array} calculationData.operands - Array of numbers to operate on
 * @param {string} calculationData.userId - Optional user ID for tracking
 * @returns {Promise<Object>} Calculation result with operation details
 */
const processCalculationOperands = async (calculationData) => {
  try {
    // Validate input
    const validation = validateCalculationInputOperands(calculationData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { operation, operands, userId } = calculationData;
    const calculator = new Calculator();
    
    let result;
    const operationLower = operation.toLowerCase();

    // Perform calculation based on operation type
    switch (operationLower) {
      case 'add':
        result = calculator.add(...operands);
        break;
      case 'subtract':
        result = calculator.subtract(operands[0], operands[1]);
        break;
      case 'multiply':
        result = calculator.multiply(...operands);
        break;
      case 'divide':
        result = calculator.divide(operands[0], operands[1]);
        break;
      case 'power':
        result = calculator.power(operands[0], operands[1]);
        break;
      case 'sqrt':
        result = calculator.sqrt(operands[0]);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    // Prepare calculation result
    const calculationResult = {
      operation: operationLower,
      operands,
      result,
      timestamp: new Date(),
      userId: userId || null,
      status: 'success'
    };

    return calculationResult;
  } catch (error) {
    throw new Error(`Calculation processing failed: ${error.message}`);
  }
};

/**
 * Saves a calculation to the database
 * @param {Object} calculationResult - The calculation result to save
 * @returns {Promise<Object>} Saved calculation document
 */
const saveCalculation = async (calculationResult) => {
  try {
    const calculation = new Calculation({
      operation: calculationResult.operation,
      operands: calculationResult.operands,
      result: calculationResult.result,
      userId: calculationResult.userId,
      timestamp: calculationResult.timestamp || new Date(),
      status: calculationResult.status || 'success'
    });

    const savedCalculation = await calculation.save();
    return savedCalculation;
  } catch (error) {
    throw new Error(`Failed to save calculation: ${error.message}`);
  }
};

async function processCalculation(expression, options = {}) {
  try {
    const validatedExpression = validateCalculationInput(expression);
    
    const startTime = Date.now();
    const result = safeEvaluate(validatedExpression);
    const endTime = Date.now();
    
    const formattedResult = formatResult(result);
    
    let saveResult = null;
    if (options.save !== false) {
      saveResult = await saveCalculationResult(validatedExpression, result, formattedResult);
    }

    return {
      success: true,
      expression: validatedExpression,
      result: result,
      formattedResult: formattedResult,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
      saved: saveResult
    };
  } catch (error) {
    if (error instanceof CalculationError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          type: 'CalculationError'
        },
        expression: expression,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred during calculation',
        code: 'UNKNOWN_ERROR',
        type: 'UnknownError',
        details: error.message
      },
      expression: expression,
      timestamp: new Date().toISOString()
    };
  }
}

function validateCalculationInput(expression, mode) {
  const service = new CalculationService();
  return service.validateCalculationInput(expression, mode);
}

// Factory function for creating service instance
function createCalculationService(database = null) {
  return new CalculationService(database);
}

// Standalone utility functions
function evaluateExpression(expression, mode = 'basic') {
  const service = new CalculationService();
  return service.evaluateExpression(expression, mode);
}

function performCalculation(calculationData) {
  const service = new CalculationService();
  return service.performCalculation(calculationData);
}

function getCalculationHistory(userId, limit = 50, offset = 0) {
  const service = new CalculationService();
  return service.getCalculationHistory(userId, limit, offset);
}

module.exports = {
  CalculationService,
  createCalculationService,
  evaluateExpression,
  performCalculation,
  getCalculationHistory,
  validateCalculationInput,
  processCalculation,
  processCalculationOperands,
  validateCalculationInputOperands,
  saveCalculation,
  saveCalculationResult,
  CalculationError
};
