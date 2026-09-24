const Calculation = require("../models/Calculation");
const History = require("../models/History");
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

function validateCalculationInput(expression) {
  if (!expression || typeof expression !== 'string') {
    throw new CalculationError('Expression must be a non-empty string', 'INVALID_INPUT');
  }

  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new CalculationError(`Expression too long. Maximum ${MAX_EXPRESSION_LENGTH} characters allowed`, 'EXPRESSION_TOO_LONG');
  }

  const sanitizedExpression = expression.trim();
  
  if (sanitizedExpression.length === 0) {
    throw new CalculationError('Expression cannot be empty', 'EMPTY_EXPRESSION');
  }

  const allowedPattern = /^[0-9+\-*/.() \t\n\r]+$/;
  if (!allowedPattern.test(sanitizedExpression)) {
    for (const func of ALLOWED_FUNCTIONS) {
      if (sanitizedExpression.includes(func)) {
        continue;
      }
    }
    
    const invalidChars = sanitizedExpression.match(/[^0-9+\-*/.() \t\n\r]/g);
    if (invalidChars) {
      const uniqueInvalidChars = [...new Set(invalidChars)];
      let hasValidFunction = false;
      
      for (const func of ALLOWED_FUNCTIONS) {
        if (sanitizedExpression.includes(func)) {
          hasValidFunction = true;
          break;
        }
      }
      
      if (!hasValidFunction) {
        throw new CalculationError(`Invalid characters detected: ${uniqueInvalidChars.join(', ')}`, 'INVALID_CHARACTERS');
      }
    }
  }

  const openParens = (sanitizedExpression.match(/\(/g) || []).length;
  const closeParens = (sanitizedExpression.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    throw new CalculationError('Mismatched parentheses', 'MISMATCHED_PARENTHESES');
  }

  if (/[+\-*/]{2,}/.test(sanitizedExpression.replace(/\s/g, ''))) {
    throw new CalculationError('Invalid operator sequence', 'INVALID_OPERATORS');
  }

  if (/[+\-*/]$/.test(sanitizedExpression.trim())) {
    throw new CalculationError('Expression cannot end with an operator', 'TRAILING_OPERATOR');
  }

  return sanitizedExpression;
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

module.exports = {
  processCalculation,
  validateCalculationInput,
  saveCalculationResult,
  CalculationError
};