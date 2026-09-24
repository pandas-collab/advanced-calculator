const Joi = require('joi');

// Schema definitions
const calculationSchema = Joi.object({
  expression: Joi.string()
    .required()
    .min(1)
    .max(1000)
    .pattern(/^[0-9+\-*/().\s]+$/)
    .messages({
      'string.pattern.base': 'Expression contains invalid characters'
    }),
  precision: Joi.number()
    .integer()
    .min(0)
    .max(15)
    .default(10),
  format: Joi.string()
    .valid('decimal', 'scientific', 'engineering')
    .default('decimal')
});

const expressionSchema = Joi.object({
  expression: Joi.string()
    .required()
    .min(1)
    .max(1000)
    .pattern(/^[0-9+\-*/().\s\w]+$/)
});

const historyQuerySchema = Joi.object({
  userId: Joi.string()
    .alphanum()
    .min(1)
    .max(50),
  startDate: Joi.date()
    .iso(),
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate')),
  expression: Joi.string()
    .min(1)
    .max(1000),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
});

const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  sortBy: Joi.string()
    .valid('createdAt', 'expression', 'result', 'userId')
    .default('createdAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

// Validation middleware factory
const createValidationMiddleware = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = property === 'query' ? req.query : 
                 property === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Assign validated and sanitized data back
    if (property === 'query') {
      req.query = value;
    } else if (property === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Additional validation helpers
const sanitizeExpression = (expression) => {
  // Remove potentially dangerous characters
  return expression
    .replace(/[^\d+\-*/().\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

const validateParentheses = (expression) => {
  let count = 0;
  for (let char of expression) {
    if (char === '(') count++;
    if (char === ')') count--;
    if (count < 0) return false;
  }
  return count === 0;
};

const validateOperators = (expression) => {
  // Check for consecutive operators
  const consecutiveOperators = /[+\-*/]{2,}/;
  if (consecutiveOperators.test(expression)) return false;
  
  // Check for operators at start/end
  const invalidStartEnd = /^[+*/]|[+\-*/]$/;
  if (invalidStartEnd.test(expression.trim())) return false;
  
  return true;
};

const validateNumbers = (expression) => {
  // Check for invalid number formats
  const invalidNumbers = /\d+\.\d*\.\d+|\.\d*\./;
  return !invalidNumbers.test(expression);
};

// Enhanced validation middleware
const validateCalculation = (req, res, next) => {
  const middleware = createValidationMiddleware(calculationSchema);
  
  middleware(req, res, (err) => {
    if (err) return next(err);
    
    // Additional expression validation
    const { expression } = req.body;
    const sanitized = sanitizeExpression(expression);
    
    if (!validateParentheses(sanitized)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parentheses in expression'
      });
    }
    
    if (!validateOperators(sanitized)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operator usage in expression'
      });
    }
    
    if (!validateNumbers(sanitized)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid number format in expression'
      });
    }
    
    req.body.expression = sanitized;
    next();
  });
};

const validateExpression = createValidationMiddleware(expressionSchema);

const validateHistoryQuery = createValidationMiddleware(historyQuerySchema, 'query');

const validatePagination = (req, res, next) => {
  const middleware = createValidationMiddleware(paginationSchema, 'query');
  
  middleware(req, res, (err) => {
    if (err) return next(err);
    
    // Calculate offset from page and limit
    const { page, limit } = req.query;
    req.query.offset = (page - 1) * limit;
    
    next();
  });
};

module.exports = {
  validateCalculation,
  validateExpression,
  validateHistoryQuery,
  validatePagination
};