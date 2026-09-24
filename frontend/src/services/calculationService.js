import { apiClient } from "./api.js";
class CalculationError extends Error {
  constructor(message, code = 'CALCULATION_ERROR', details = null) {
    super(message);
    this.name = 'CalculationError';
    this.code = code;
    this.details = details;
  }
}

class CalculationService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
    this.requestQueue = new Map();
    this.debounceTimeout = null;
    this.throttleMap = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new CalculationError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            errorData.code || 'HTTP_ERROR',
            { status: response.status, ...errorData }
          );
        }

        return await response.json();
      } catch (error) {
        attempt++;
        
        if (error instanceof CalculationError) {
          throw error;
        }

        if (attempt >= this.maxRetries) {
          throw new CalculationError(
            `Network error after ${this.maxRetries} attempts: ${error.message}`,
            'NETWORK_ERROR',
            { originalError: error }
          );
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  validateExpression(expression) {
    if (!expression || typeof expression !== 'string') {
      return {
        isValid: false,
        errors: ['Expression must be a non-empty string']
      };
    }

    const trimmed = expression.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        errors: ['Expression cannot be empty']
      };
    }

    const errors = [];

    // Check for invalid characters
    const validChars = /^[0-9+\-*/.() \t\n]+$/;
    if (!validChars.test(trimmed)) {
      errors.push('Expression contains invalid characters');
    }

    // Check for balanced parentheses
    let parenthesesCount = 0;
    for (const char of trimmed) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (parenthesesCount < 0) {
        errors.push('Unbalanced parentheses');
        break;
      }
    }
    if (parenthesesCount > 0) {
      errors.push('Unbalanced parentheses');
    }

    // Check for consecutive operators
    if (/[+\-*/]{2,}/.test(trimmed)) {
      errors.push('Consecutive operators are not allowed');
    }

    // Check for division by zero
    if (/\/\s*0(?!\d)/.test(trimmed)) {
      errors.push('Division by zero is not allowed');
    }

    // Check if expression starts or ends with an operator
    if (/^[+\-*/]/.test(trimmed.replace(/^\s*-/, '')) || /[+\-*/]\s*$/.test(trimmed)) {
      errors.push('Expression cannot start or end with an operator');
    }

    return {
      isValid: errors.length === 0,
      errors,
      normalizedExpression: trimmed
    };
  }

  formatCalculationRequest(expression, options = {}) {
    const validation = this.validateExpression(expression);
    
    if (!validation.isValid) {
      throw new CalculationError(
        `Invalid expression: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        { errors: validation.errors }
      );
    }

    return {
      expression: validation.normalizedExpression,
      precision: options.precision || 10,
      format: options.format || 'decimal',
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    };
  }

  generateRequestId() {
    return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  debounce(func, delay) {
    return (...args) => {
      clearTimeout(this.debounceTimeout);
      return new Promise((resolve, reject) => {
        this.debounceTimeout = setTimeout(async () => {
          try {
            const result = await func.apply(this, args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    };
  }

  throttle(func, delay) {
    return (...args) => {
      const key = JSON.stringify(args);
      const now = Date.now();
      
      if (this.throttleMap.has(key)) {
        const lastCall = this.throttleMap.get(key);
        if (now - lastCall < delay) {
          return Promise.reject(new CalculationError(
            'Request throttled. Please wait before making another request.',
            'THROTTLED'
          ));
        }
      }
      
      this.throttleMap.set(key, now);
      return func.apply(this, args);
    };
  }

  async processCalculation(expression, options = {}) {
    try {
      const request = this.formatCalculationRequest(expression, options);
      
      // Check if request is already in queue
      const queueKey = `${request.expression}_${request.precision}_${request.format}`;
      if (this.requestQueue.has(queueKey)) {
        return await this.requestQueue.get(queueKey);
      }

      // Add request to queue
      const calculationPromise = this.makeRequest('/calculate', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      this.requestQueue.set(queueKey, calculationPromise);

      // Clean up queue after request completes
      calculationPromise.finally(() => {
        setTimeout(() => {
          this.requestQueue.delete(queueKey);
        }, 1000); // Keep in cache for 1 second
      });

      const response = await calculationPromise;

      if (!response.success) {
        throw new CalculationError(
          response.error || 'Calculation failed',
          response.code || 'CALCULATION_FAILED',
          response
        );
      }

      return {
        result: response.result,
        expression: request.expression,
        requestId: request.requestId,
        timestamp: response.timestamp || Date.now(),
        executionTime: response.executionTime,
        metadata: response.metadata || {}
      };
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error;
      }
      throw new CalculationError(
        `Calculation service error: ${error.message}`,
        'SERVICE_ERROR',
        { originalError: error }
      );
    }
  }

  clearCache() {
    this.requestQueue.clear();
    this.throttleMap.clear();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
}

const calculationService = new CalculationService();

// Create throttled and debounced versions
const throttledCalculation = calculationService.throttle(
  calculationService.processCalculation.bind(calculationService),
  100
);

const debouncedCalculation = calculationService.debounce(
  calculationService.processCalculation.bind(calculationService),
  300
);

export const calculateExpression = async (expression, options = {}) => {
  const strategy = options.strategy || 'throttled';
  
  switch (strategy) {
    case 'debounced':
      return await debouncedCalculation(expression, options);
    case 'immediate':
      return await calculationService.processCalculation(expression, options);
    case 'throttled':
    default:
      return await throttledCalculation(expression, options);
  }
};

export const validateExpression = (expression) => {
  return calculationService.validateExpression(expression);
};

export const formatCalculationRequest = (expression, options = {}) => {
  return calculationService.formatCalculationRequest(expression, options);
};

export { CalculationError };

export default calculationService;
// Enhanced API integration
export const performCalculation = async (expression, options = {}) => {
  try {
    const response = await apiClient.post('/api/calculate', {
      expression,
      precision: options.precision || 10,
      format: options.format || 'decimal'
    });
    return response.data;
  } catch (error) {
    throw new Error(`Calculation failed: ${error.message}`);
  }
};
