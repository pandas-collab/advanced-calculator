const { Calculator } = require('../utils/mathOperations');
const Calculation = require('../models/Calculation');

/**
 * Validates calculation input parameters
 * @param {Object} input - The calculation input object
 * @param {string} input.operation - The mathematical operation
 * @param {Array} input.operands - Array of numbers to operate on
 * @returns {Object} Validation result with isValid boolean and errors array
 */
const validateCalculationInput = (input) => {
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
 * Processes a calculation request
 * @param {Object} calculationData - The calculation data
 * @param {string} calculationData.operation - The mathematical operation
 * @param {Array} calculationData.operands - Array of numbers to operate on
 * @param {string} calculationData.userId - Optional user ID for tracking
 * @returns {Promise<Object>} Calculation result with operation details
 */
const processCalculation = async (calculationData) => {
  try {
    // Validate input
    const validation = validateCalculationInput(calculationData);
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

module.exports = {
  processCalculation,
  validateCalculationInput,
  saveCalculation
};