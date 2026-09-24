const db = require("../config/database.js");
const mongoose = require('mongoose');

// History schema definition
const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  calculation: {
    type: String,
    required: true,
    trim: true
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  operation: {
    type: String,
    required: true,
    enum: ['basic', 'scientific', 'unit_conversion', 'currency', 'percentage', 'statistical']
  },
  metadata: {
    operands: [mongoose.Schema.Types.Mixed],
    operator: String,
    precision: Number,
    units: {
      from: String,
      to: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
historySchema.index({ userId: 1, createdAt: -1 });
historySchema.index({ userId: 1, operation: 1 });
historySchema.index({ calculation: 'text', result: 'text' });

const History = mongoose.model('History', historySchema);

const createHistoryEntry = async (userId, calculationData) => {
  try {
    if (!userId || !calculationData) {
      throw new Error('User ID and calculation data are required');
    }

    const historyEntry = new History({
      userId: new mongoose.Types.ObjectId(userId),
      calculation: calculationData.calculation,
      result: calculationData.result,
      operation: calculationData.operation || 'basic',
      metadata: calculationData.metadata || {}
    });

    const savedEntry = await historyEntry.save();
    return {
      success: true,
      data: savedEntry,
      message: 'History entry created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to create history entry'
    };
  }
};

const getUserHistory = async (userId, options = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      operation = null
    } = options;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = { userId: new mongoose.Types.ObjectId(userId) };

    if (operation) {
      query.operation = operation;
    }

    const [history, totalCount] = await Promise.all([
      History.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      History.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      message: 'History retrieved successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to retrieve user history'
    };
  }
};

const deleteHistoryEntry = async (userId, entryId) => {
  try {
    if (!userId || !entryId) {
      throw new Error('User ID and entry ID are required');
    }

    const deletedEntry = await History.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(entryId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!deletedEntry) {
      return {
        success: false,
        message: 'History entry not found or unauthorized'
      };
    }

    return {
      success: true,
      data: deletedEntry,
      message: 'History entry deleted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to delete history entry'
    };
  }
};

const searchHistory = async (userId, searchOptions = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const {
      query: searchQuery = '',
      page = 1,
      limit = 20,
      operation = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = searchOptions;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let mongoQuery = { userId: new mongoose.Types.ObjectId(userId) };

    if (operation) {
      mongoQuery.operation = operation;
    }

    if (searchQuery && searchQuery.trim()) {
      mongoQuery.$or = [
        { calculation: { $regex: searchQuery, $options: 'i' } },
        { result: { $regex: searchQuery.toString(), $options: 'i' } }
      ];
    }

    const [results, totalCount] = await Promise.all([
      History.find(mongoQuery)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      History.countDocuments(mongoQuery)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        results,
        searchQuery,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      message: 'Search completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to search history'
    };
  }
};

const getHistoryByDateRange = async (userId, dateOptions = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const {
      startDate,
      endDate,
      page = 1,
      limit = 20,
      operation = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = dateOptions;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new Error('Start date must be before end date');
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = {
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    if (operation) {
      query.operation = operation;
    }

    const [history, totalCount] = await Promise.all([
      History.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      History.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Calculate summary statistics
    const summary = await History.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$operation',
          count: { $sum: 1 },
          avgCalculationsPerDay: {
            $avg: {
              $dayOfYear: '$createdAt'
            }
          }
        }
      }
    ]);

    return {
      success: true,
      data: {
        history,
        dateRange: {
          startDate: start,
          endDate: end
        },
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      message: 'History retrieved successfully for date range'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to retrieve history by date range'
    };
  }
};

module.exports = {
  createHistoryEntry,
  getUserHistory,
  deleteHistoryEntry,
  searchHistory,
  getHistoryByDateRange
};
// Enhanced search and filter functionality
const searchHistory = async ({ query, dateFrom, dateTo, calculationMode, page = 1, limit = 10 }) => {
  try {
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (query) {
      whereClause += ` AND (expression LIKE $${paramIndex} OR result LIKE $${paramIndex + 1})`;
      params.push(`%${query}%`, `%${query}%`);
      paramIndex += 2;
    }

    if (dateFrom) {
      whereClause += ` AND timestamp >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClause += ` AND timestamp <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    if (calculationMode) {
      whereClause += ` AND calculation_mode = $${paramIndex}`;
      params.push(calculationMode);
      paramIndex++;
    }

    const offset = (page - 1) * limit;
    const sql = `SELECT * FROM calculation_history ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    throw new Error(`Search history failed: ${error.message}`);
  }
};

module.exports = {
  saveCalculation,
  getHistory,
  deleteHistory,
  searchHistory
};
