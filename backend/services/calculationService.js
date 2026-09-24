const math = require('mathjs');
const Database = require('../database/connection');

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

  validateCalculationInput(expression, mode) {
    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression must be a non-empty string');
    }

    // Remove whitespace
    const cleanExpression = expression.trim();
    
    if (cleanExpression.length === 0) {
      throw new Error('Expression cannot be empty');
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

function validateCalculationInput(expression, mode = 'basic') {
  const service = new CalculationService();
  return service.validateCalculationInput(expression, mode);
}

module.exports = {
  CalculationService,
  createCalculationService,
  evaluateExpression,
  performCalculation,
  getCalculationHistory,
  validateCalculationInput
};