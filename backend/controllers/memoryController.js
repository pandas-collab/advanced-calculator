const asyncHandler = require('express-async-handler');

// In-memory storage for demonstration (replace with database in production)
let memoryStorage = {};

// @desc    Get memory value by key
// @route   GET /api/memory/:key
// @access  Private
const getMemory = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const userId = req.user.id;
  
  const userMemory = memoryStorage[userId] || {};
  const value = userMemory[key];
  
  if (value === undefined) {
    res.status(404);
    throw new Error('Memory key not found');
  }
  
  res.json({
    success: true,
    data: {
      key,
      value
    }
  });
});

// @desc    Set memory value by key
// @route   POST /api/memory
// @access  Private
const setMemory = asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  const userId = req.user.id;
  
  if (!key) {
    res.status(400);
    throw new Error('Key is required');
  }
  
  if (!memoryStorage[userId]) {
    memoryStorage[userId] = {};
  }
  
  memoryStorage[userId][key] = value;
  
  res.json({
    success: true,
    data: {
      key,
      value
    }
  });
});

// @desc    Clear memory (single key or all)
// @route   DELETE /api/memory/:key?
// @access  Private
const clearMemory = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const userId = req.user.id;
  
  if (!memoryStorage[userId]) {
    memoryStorage[userId] = {};
  }
  
  if (key) {
    delete memoryStorage[userId][key];
    res.json({
      success: true,
      message: `Memory key '${key}' cleared`
    });
  } else {
    memoryStorage[userId] = {};
    res.json({
      success: true,
      message: 'All memory cleared'
    });
  }
});

// @desc    Add to memory value (numeric operation)
// @route   PUT /api/memory/:key/add
// @access  Private
const addToMemory = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const userId = req.user.id;
  
  if (value === undefined || value === null) {
    res.status(400);
    throw new Error('Value is required');
  }
  
  if (!memoryStorage[userId]) {
    memoryStorage[userId] = {};
  }
  
  const currentValue = memoryStorage[userId][key] || 0;
  const numericCurrentValue = Number(currentValue);
  const numericValue = Number(value);
  
  if (isNaN(numericCurrentValue) || isNaN(numericValue)) {
    res.status(400);
    throw new Error('Values must be numeric');
  }
  
  memoryStorage[userId][key] = numericCurrentValue + numericValue;
  
  res.json({
    success: true,
    data: {
      key,
      value: memoryStorage[userId][key],
      operation: 'add',
      addedValue: numericValue
    }
  });
});

// @desc    Subtract from memory value (numeric operation)
// @route   PUT /api/memory/:key/subtract
// @access  Private
const subtractFromMemory = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const userId = req.user.id;
  
  if (value === undefined || value === null) {
    res.status(400);
    throw new Error('Value is required');
  }
  
  if (!memoryStorage[userId]) {
    memoryStorage[userId] = {};
  }
  
  const currentValue = memoryStorage[userId][key] || 0;
  const numericCurrentValue = Number(currentValue);
  const numericValue = Number(value);
  
  if (isNaN(numericCurrentValue) || isNaN(numericValue)) {
    res.status(400);
    throw new Error('Values must be numeric');
  }
  
  memoryStorage[userId][key] = numericCurrentValue - numericValue;
  
  res.json({
    success: true,
    data: {
      key,
      value: memoryStorage[userId][key],
      operation: 'subtract',
      subtractedValue: numericValue
    }
  });
});

// @desc    Get all memory for user
// @route   GET /api/memory
// @access  Private
const getAllMemory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userMemory = memoryStorage[userId] || {};
  
  res.json({
    success: true,
    data: userMemory,
    count: Object.keys(userMemory).length
  });
});

module.exports = {
  getMemory,
  setMemory,
  clearMemory,
  addToMemory,
  subtractFromMemory,
  getAllMemory
};