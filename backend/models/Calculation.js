const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema({
  operation: {
    type: String,
    required: true,
    enum: ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'sin', 'cos', 'tan', 'log']
  },
  operands: [{
    type: Number,
    required: true
  }],
  result: {
    type: Number,
    required: true
  },
  expression: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sessionId: {
    type: String,
    required: false
  },
  isError: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

calculationSchema.index({ userId: 1, timestamp: -1 });
calculationSchema.index({ sessionId: 1, timestamp: -1 });
calculationSchema.index({ timestamp: -1 });

calculationSchema.methods.toJSON = function() {
  const calculation = this.toObject();
  return {
    id: calculation._id,
    operation: calculation.operation,
    operands: calculation.operands,
    result: calculation.result,
    expression: calculation.expression,
    timestamp: calculation.timestamp,
    userId: calculation.userId,
    sessionId: calculation.sessionId,
    isError: calculation.isError,
    errorMessage: calculation.errorMessage
  };
};

calculationSchema.statics.getHistory = function(userId, sessionId, limit = 50) {
  const query = {};
  if (userId) query.userId = userId;
  if (sessionId) query.sessionId = sessionId;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

calculationSchema.statics.deleteHistory = function(userId, sessionId) {
  const query = {};
  if (userId) query.userId = userId;
  if (sessionId) query.sessionId = sessionId;
  
  return this.deleteMany(query);
};

const Calculation = mongoose.model('Calculation', calculationSchema);

module.exports = Calculation;