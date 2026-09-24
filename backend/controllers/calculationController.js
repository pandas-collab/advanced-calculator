const calculationService = require("../services/calculationService");
const mathService = require('../services/mathService');

// Input validation helper
const validateInput = (input, type = 'number') => {
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }
  
  if (type === 'number') {
    const num = parseFloat(input);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number input');
    }
    return num;
  }
  
  if (type === 'string') {
    if (typeof input !== 'string' || input.trim().length === 0) {
      throw new Error('Invalid string input');
    }
    return input.trim();
  }
  
  return input;
};

// Standardized response formatter
const formatResponse = (success, data, message = null, error = null) => {
  return {
    success,
    data: success ? data : null,
    message,
    error: error ? error.message || error : null,
    timestamp: new Date().toISOString()
  };
};

// Calculate basic arithmetic operations
const calculate = async (req, res) => {
  try {
    const { operation, operand1, operand2 } = req.body;
    
    if (!operation) {
      return res.status(400).json(
        formatResponse(false, null, 'Operation is required', 'Missing operation parameter')
      );
    }
    
    const num1 = validateInput(operand1, 'number');
    const num2 = validateInput(operand2, 'number');
    const op = validateInput(operation, 'string').toLowerCase();
    
    const result = await mathService.performBasicOperation(op, num1, num2);
    
    res.status(200).json(
      formatResponse(true, {
        result,
        operation: op,
        operands: [num1, num2]
      }, 'Calculation completed successfully')
    );
    
  } catch (error) {
    console.error('Calculation error:', error);
    
    const statusCode = error.message.includes('Invalid') || 
                      error.message.includes('required') ||
                      error.message.includes('Division by zero') ? 400 : 500;
    
    res.status(statusCode).json(
      formatResponse(false, null, 'Calculation failed', error)
    );
  }
};

// Evaluate complex mathematical expressions
const evaluateExpression = async (req, res) => {
  try {
    const { expression } = req.body;
    
    if (!expression) {
      return res.status(400).json(
        formatResponse(false, null, 'Expression is required', 'Missing expression parameter')
      );
    }
    
    const expr = validateInput(expression, 'string');
    
    // Basic security check for potentially dangerous expressions
    if (/[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(expr) && 
        !/^[0-9+\-*/().\s^%√πe∞sincostanlogln]+$/.test(expr)) {
      throw new Error('Expression contains potentially unsafe functions');
    }
    
    const result = await mathService.evaluateExpression(expr);
    
    res.status(200).json(
      formatResponse(true, {
        result,
        expression: expr,
        type: typeof result === 'number' ? 'number' : typeof result
      }, 'Expression evaluated successfully')
    );
    
  } catch (error) {
    console.error('Expression evaluation error:', error);
    
    const statusCode = error.message.includes('Invalid') || 
                      error.message.includes('required') ||
                      error.message.includes('unsafe') ||
                      error.message.includes('Syntax') ? 400 : 500;
    
    res.status(statusCode).json(
      formatResponse(false, null, 'Expression evaluation failed', error)
    );
  }
};

// Perform specific mathematical operations
const performOperation = async (req, res) => {
  try {
    const { type, values, options = {} } = req.body;
    
    if (!type) {
      return res.status(400).json(
        formatResponse(false, null, 'Operation type is required', 'Missing type parameter')
      );
    }
    
    if (!values || !Array.isArray(values)) {
      return res.status(400).json(
        formatResponse(false, null, 'Values array is required', 'Missing or invalid values parameter')
      );
    }
    
    const operationType = validateInput(type, 'string').toLowerCase();
    const validatedValues = values.map(val => validateInput(val, 'number'));
    
    let result;
    
    switch (operationType) {
      case 'sum':
        result = await mathService.sum(validatedValues);
        break;
      case 'average':
      case 'mean':
        result = await mathService.mean(validatedValues);
        break;
      case 'median':
        result = await mathService.median(validatedValues);
        break;
      case 'mode':
        result = await mathService.mode(validatedValues);
        break;
      case 'min':
        result = await mathService.min(validatedValues);
        break;
      case 'max':
        result = await mathService.max(validatedValues);
        break;
      case 'std':
      case 'standarddeviation':
        result = await mathService.std(validatedValues, options.sample);
        break;
      case 'variance':
        result = await mathService.variance(validatedValues, options.sample);
        break;
      case 'factorial':
        if (validatedValues.length !== 1) {
          throw new Error('Factorial operation requires exactly one value');
        }
        result = await mathService.factorial(validatedValues[0]);
        break;
      case 'gcd':
        result = await mathService.gcd(validatedValues);
        break;
      case 'lcm':
        result = await mathService.lcm(validatedValues);
        break;
      default:
        throw new Error(`Unsupported operation type: ${operationType}`);
    }
    
    res.status(200).json(
      formatResponse(true, {
        result,
        operation: operationType,
        values: validatedValues,
        options
      }, `${operationType} operation completed successfully`)
    );
    
  } catch (error) {
    console.error('Operation error:', error);
    
    const statusCode = error.message.includes('Invalid') || 
                      error.message.includes('required') ||
                      error.message.includes('Unsupported') ||
                      error.message.includes('exactly one') ? 400 : 500;
    
    res.status(statusCode).json(
      formatResponse(false, null, 'Operation failed', error)
    );
  }
};

module.exports = {
  calculate,
  evaluateExpression,
  performOperation
};