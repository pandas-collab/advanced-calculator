const db = require("../config/database.js");
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
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'timestamp',
        sortOrder = 'DESC',
        startDate,
        endDate,
        type,
        status,
        operation = null
      } = options;

      const offset = (page - 1) * limit;
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

      // Also try MongoDB approach for compatibility
      if (!userId) {
        throw new Error('User ID is required');
      }

      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      let mongoQuery = { userId: new mongoose.Types.ObjectId(userId) };

      if (operation) {
        mongoQuery.operation = operation;
      }

      const [mongoHistory, mongoTotalCount] = await Promise.all([
        MongoHistory.find(mongoQuery)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        MongoHistory.countDocuments(mongoQuery)
      ]);

      const mongoTotalPages = Math.ceil(mongoTotalCount / limit);

      return {
        histories: rows,
        items: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        total: count,
        totalPages: Math.ceil(count / limit),
        mongoData: {
          history: mongoHistory,
          pagination: {
            currentPage: parseInt(page),
            totalPages: mongoTotalPages,
            totalItems: mongoTotalCount,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < mongoTotalPages,
            hasPrevPage: page > 1
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user history: ${error.message}`);
    }
  }

  async deleteHistory(historyId, userId = null) {
    try {
      const where = { id: historyId };
      
      // If userId is provided, ensure user can only delete their own history
      if (userId) {
        where.userId = userId;
      }

      const deleted = await History.destroy({ where });
      
      if (deleted === 0) {
        throw new Error('History record not found or access denied');
      }

      return { success: true, message: 'History record deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete history record: ${error.message}`);
    }
  }

  async deleteHistoryItem(userId, historyId) {
    try {
      const deleted = await History.destroy({
        where: {
          id: historyId,
          userId
        }
      });

      if (deleted === 0) {
        throw new Error('History item not found or unauthorized');
      }

      return { success: true, message: 'History item deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete history item: ${error.message}`);
    }
  }

  async clearUserHistory(userId) {
    try {
      const deletedCount = await History.destroy({
        where: { userId }
      });

      return {
        success: true,
        message: `Cleared ${deletedCount} history items`,
        deletedCount
      };
    } catch (error) {
      throw new Error(`Failed to clear user history: ${error.message}`);
    }
  }

  async searchHistory(userId, searchTerm, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'timestamp',
        sortOrder = 'DESC',
        type,
        status,
        operation = null
      } = options;

      const offset = (page - 1) * limit;
      const where = {
        userId,
        [Op.or]: [
          { title: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } },
          { metadata: { [Op.iLike]: `%${searchTerm}%` } },
          { query: { [Op.iLike]: `%${searchTerm}%` } },
          { response: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      };

      // Add additional filters
      if (type) where.type = type;
      if (status) where.status = status;

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

      // MongoDB search
      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      let mongoQuery = {
        userId: new mongoose.Types.ObjectId(userId)
      };

      if (operation) {
        mongoQuery.operation = operation;
      }

      if (searchTerm && searchTerm.trim()) {
        mongoQuery.$or = [
          { calculation: { $regex: searchTerm, $options: 'i' } },
          { result: { $regex: searchTerm.toString(), $options: 'i' } }
        ];
      }

      const [mongoResults, mongoTotalCount] = await Promise.all([
        MongoHistory.find(mongoQuery)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        MongoHistory.countDocuments(mongoQuery)
      ]);

      const mongoTotalPages = Math.ceil(mongoTotalCount / limit);

      return {
        histories: rows,
        items: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        total: count,
        totalPages: Math.ceil(count / limit),
        searchTerm,
        mongoData: {
          results: mongoResults,
          searchQuery: searchTerm,
          pagination: {
            currentPage: parseInt(page),
            totalPages: mongoTotalPages,
            totalItems: mongoTotalCount,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < mongoTotalPages,
            hasPrevPage: page > 1
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to search history: ${error.message}`);
    }
  }

  async getHistoryById(historyId, userId = null) {
    try {
      const where = { id: historyId };
      
      // If userId is provided, ensure user can only access their own history
      if (userId) {
        where.userId = userId;
      }

      const history = await History.findOne({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      if (!history) {
        throw new Error('History record not found or access denied');
      }

      return history;
    } catch (error) {
      throw new Error(`Failed to get history record: ${error.message}`);
    }
  }

  async bulkDeleteHistory(historyIds, userId) {
    try {
      const deleted = await History.destroy({
        where: {
          id: { [Op.in]: historyIds },
          userId
        }
      });

      return {
        success: true,
        deletedCount: deleted,
        message: `${deleted} history records deleted successfully`
      };
    } catch (error) {
      throw new Error(`Failed to bulk delete history records: ${error.message}`);
    }
  }

  async getHistoryStats(userId, options = {}) {
    try {
      const { startDate, endDate } = options;
      const where = { userId };

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp[Op.gte] = new Date(startDate);
        if (endDate) where.timestamp[Op.lte] = new Date(endDate);
      }

      const stats = await History.findAll({
        where,
        attributes: [
          'type',
          [History.sequelize.fn('COUNT', History.sequelize.col('id')), 'count'],
          [History.sequelize.fn('MAX', History.sequelize.col('timestamp')), 'lastActivity']
        ],
        group: ['type'],
        raw: true
      });

      const totalCount = await History.count({ where });

      return {
        totalRecords: totalCount,
        byType: stats,
        period: { startDate, endDate }
      };
    } catch (error) {
      throw new Error(`Failed to get history statistics: ${error.message}`);
    }
  }

  async getMemorySlots(userId) {
    try {
      const memorySlots = await Memory.findAll({
        where: { userId },
        order: [['slotNumber', 'ASC']],
        attributes: ['id', 'slotNumber', 'title', 'content', 'metadata', 'createdAt', 'updatedAt']
      });

      const slots = Array.from({ length: 10 }, (_, index) => {
        const slotNumber = index + 1;
        const existingSlot = memorySlots.find(slot => slot.slotNumber === slotNumber);
        
        return existingSlot || {
          slotNumber,
          title: null,
          content: null,
          metadata: {},
          isEmpty: true
        };
      });

      return slots;
    } catch (error) {
      throw new Error(`Failed to get memory slots: ${error.message}`);
    }
  }
}

module.exports = {
  HistoryService,
  addToHistory,
  deleteHistoryItem,
  clearHistory,
  loadHistory,
  saveHistory,
  createHistoryEntry,
  getUserHistory: async (userId, options = {}) => {
    const service = new HistoryService();
    return service.getUserHistory(userId, options);
  },
  deleteHistoryEntry,
  searchHistory: searchHistoryByQuery,
  getHistoryByDateRange
};
