const db = require("../config/database.js");
const pool = require('../config/database');
const { Op } = require('sequelize');
const { History, User, Memory } = require('../models');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/history.json');

// History schema definition for MongoDB
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

const MongoHistory = mongoose.model('History', historySchema);

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(HISTORY_FILE);
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Load history from file
const loadHistory = async () => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Save history to file
const saveHistory = async (history) => {
  await ensureDataDirectory();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
};

// Add new calculation to history
const addToHistory = async (calculation) => {
  const history = await loadHistory();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...calculation
  };
  
  history.unshift(newEntry);
  
  // Keep only last 1000 entries
  if (history.length > 1000) {
    history.splice(1000);
  }
  
  await saveHistory(history);
  return newEntry;
};

// Delete specific history item
const deleteHistoryItem = async (itemId) => {
  const history = await loadHistory();
  const initialLength = history.length;
  
  const updatedHistory = history.filter(item => item.id !== itemId);
  
  if (updatedHistory.length === initialLength) {
    throw new Error('History item not found');
  }
  
  await saveHistory(updatedHistory);
  
  return {
    success: true,
    message: 'History item deleted successfully',
    deletedId: itemId
  };
};

// Clear all history
const clearHistory = async () => {
  await saveHistory([]);
  
  return {
    success: true,
    message: 'All history cleared successfully'
  };
};

// MongoDB functions
const createHistoryEntry = async (userId, calculationData) => {
  try {
    if (!userId || !calculationData) {
      throw new Error('User ID and calculation data are required');
    }

    const historyEntry = new MongoHistory({
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

const deleteHistoryEntry = async (userId, entryId) => {
  try {
    if (!userId || !entryId) {
      throw new Error('User ID and entry ID are required');
    }

    const deletedEntry = await MongoHistory.findOneAndDelete({
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
      MongoHistory.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MongoHistory.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Calculate summary statistics
    const summary = await MongoHistory.aggregate([
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

// Enhanced search and filter functionality
const searchHistoryByQuery = async ({ query, dateFrom, dateTo, calculationMode, page = 1, limit = 10 }) => {
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

class HistoryService {
  async saveCalculation(userId, calculation) {
    const { expression, result, calculationType } = calculation;
    const query = `
      INSERT INTO calculation_history (user_id, expression, result, calculation_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, expression, result, calculation_type, created_at
    `;
    
    try {
      const values = [userId, expression, result, calculationType || 'basic'];
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to save calculation: ${error.message}`);
    }
  }

  async createHistory(userId, data) {
    try {
      const historyRecord = await History.create({
        userId,
        ...data,
        timestamp: new Date()
      });
      
      return await this.getHistoryById(historyRecord.id);
    } catch (error) {
      throw new Error(`Failed to create history record: ${error.message}`);
    }
  }

  async saveToHistory(userId, data) {
    try {
      const historyItem = await History.create({
        userId,
        query: data.query,
        response: data.response,
        metadata: data.metadata || {},
        timestamp: new Date()
      });
      return historyItem;
    } catch (error) {
      throw new Error(`Failed to save history: ${error.message}`);
    }
  }

  async getUserHistory(userId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      calculationType = null,
      startDate = null,
      endDate = null,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      type,
      status,
      operation = null
    } = options;

    const offset = (page - 1) * limit;

    // PostgreSQL implementation (from THEIRS)
    if (pool) {
      let whereConditions = ['user_id = $1'];
      let queryParams = [userId];
      let paramCount = 1;

      if (calculationType) {
        paramCount++;
        whereConditions.push(`calculation_type = $${paramCount}`);
        queryParams.push(calculationType);
      }

      if (startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(endDate);
      }

      const whereClause = whereConditions.join(' AND ');
      const validSortFields = ['created_at', 'expression', 'result', 'calculation_type'];
      const validSortOrders = ['ASC', 'DESC'];
      
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const countQuery = `
        SELECT COUNT(*) as total
        FROM calculation_history
        WHERE ${whereClause}
      `;

      const dataQuery = `
        SELECT id, expression, result, calculation_type, created_at
        FROM calculation_history
        WHERE ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      try {
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        
        queryParams.push(limit, offset);
        const dataResult = await pool.query(dataQuery, queryParams);

        return {
          data: dataResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        };
      } catch (error) {
        throw new Error(`Failed to retrieve user history: ${error.message}`);
      }
    }

    // Sequelize implementation (from OURS)
    try {
      const where = { userId };

      // Add date range filter
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp[Op.gte] = new Date(startDate);
        if (endDate) where.timestamp[Op.lte] = new Date(endDate);
      }

      // Add type filter
      if (type) {
        where.type = type;
      }

      // Add status filter
      if (status) {
        where.status = status;
      }

      const { count, rows } = await History.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      return {
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to retrieve user history: ${error.message}`);
    }
  }

  async deleteCalculation(userId, calculationId) {
    const query = `
      DELETE FROM calculation_history
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    try {
      const { rows } = await pool.query(query, [calculationId, userId]);
      
      if (rows.length === 0) {
        throw new Error('Calculation not found or unauthorized');
      }

      return { success: true, deletedId: rows[0].id };
    } catch (error) {
      throw new Error(`Failed to delete calculation: ${error.message}`);
    }
  }

  async clearUserHistory(userId, calculationType = null) {
    let query = 'DELETE FROM calculation_history WHERE user_id = $1';
    let params = [userId];

    if (calculationType) {
      query += ' AND calculation_type = $2';
      params.push(calculationType);
    }

    query += ' RETURNING COUNT(*) as deleted_count';

    try {
      const { rows } = await pool.query(query, params);
      return { 
        success: true, 
        deletedCount: parseInt(rows[0].deleted_count || 0),
        message: `Cleared ${rows[0].deleted_count || 0} calculations from history`
      };
    } catch (error) {
      throw new Error(`Failed to clear user history: ${error.message}`);
    }
  }

  async getCalculationById(userId, calculationId) {
    const query = `
      SELECT id, expression, result, calculation_type, created_at
      FROM calculation_history
      WHERE id = $1 AND user_id = $2
    `;

    try {
      const { rows } = await pool.query(query, [calculationId, userId]);
      
      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      throw new Error(`Failed to retrieve calculation: ${error.message}`);
    }
  }

  async getHistoryById(historyId) {
    try {
      const history = await History.findByPk(historyId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      return history;
    } catch (error) {
      throw new Error(`Failed to retrieve history by ID: ${error.message}`);
    }
  }

  async getHistoryStats(userId) {
    const query = `
      SELECT 
        calculation_type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM calculation_history
      WHERE user_id = $1
      GROUP BY calculation_type, DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    try {
      const { rows } = await pool.query(query, [userId]);
      return rows;
    } catch (error) {
      throw new Error(`Failed to retrieve history statistics: ${error.message}`);
    }
  }
}

const historyService = new HistoryService();

module.exports = {
  // File-based functions
  addToHistory,
  deleteHistoryItem,
  clearHistory,
  loadHistory,
  saveHistory,
  
  // MongoDB functions
  createHistoryEntry,
  deleteHistoryEntry,
  getHistoryByDateRange,
  searchHistoryByQuery,
  
  // Service class methods
  saveCalculation: (userId, calculation) => historyService.saveCalculation(userId, calculation),
  getUserHistory: (userId, options) => historyService.getUserHistory(userId, options),
  deleteCalculation: (userId, calculationId) => historyService.deleteCalculation(userId, calculationId),
  clearUserHistory: (userId, calculationType) => historyService.clearUserHistory(userId, calculationType),
  getCalculationById: (userId, calculationId) => historyService.getCalculationById(userId, calculationId),
  getHistoryStats: (userId) => historyService.getHistoryStats(userId),
  createHistory: (userId, data) => historyService.createHistory(userId, data),
  saveToHistory: (userId, data) => historyService.saveToHistory(userId, data),
  getHistoryById: (historyId) => historyService.getHistoryById(historyId),
  
  // Export the service class itself
  HistoryService
};
