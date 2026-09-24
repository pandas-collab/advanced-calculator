const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  calculationType: {
    type: String,
    required: true,
    enum: ['basic', 'scientific', 'financial', 'statistical']
  },
  expression: {
    type: String,
    required: true
  },
  result: {
    type: String,
    required: true
  },
  inputs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  metadata: {
    operationCount: {
      type: Number,
      default: 0
    },
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      default: 'simple'
    },
    executionTime: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isBookmarked: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

historySchema.index({ userId: 1, createdAt: -1 });
historySchema.index({ calculationType: 1 });
historySchema.index({ shareId: 1 });
historySchema.index({ isBookmarked: 1 });
historySchema.index({ 'metadata.complexity': 1 });

historySchema.methods.generateShareId = function() {
  if (!this.shareId) {
    this.shareId = require('crypto').randomBytes(16).toString('hex');
  }
  return this.shareId;
};

historySchema.statics.getRecentByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username email');
};

historySchema.statics.getByType = function(userId, calculationType, limit = 20) {
  return this.find({ userId, calculationType })
    .sort({ createdAt: -1 })
    .limit(limit);
};

historySchema.statics.getBookmarked = function(userId) {
  return this.find({ userId, isBookmarked: true })
    .sort({ createdAt: -1 });
};

historySchema.statics.searchHistory = function(userId, searchTerm) {
  return this.find({
    userId,
    $or: [
      { expression: { $regex: searchTerm, $options: 'i' } },
      { result: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).sort({ createdAt: -1 });
};

historySchema.pre('save', function(next) {
  if (this.isModified('expression')) {
    this.metadata.operationCount = (this.expression.match(/[+\-*/^()]/g) || []).length;
    
    if (this.metadata.operationCount <= 3) {
      this.metadata.complexity = 'simple';
    } else if (this.metadata.operationCount <= 10) {
      this.metadata.complexity = 'medium';
    } else {
      this.metadata.complexity = 'complex';
    }
  }
  next();
});

module.exports = mongoose.model('History', historySchema);