const db = require("../config/database.js");
const { Op } = require('sequelize');
const { History, User, Memory } = require('../models');
const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/history.json');

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
        status
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
        totalPages: Math.ceil(count / limit)
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
        status
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
        searchTerm
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

  async saveToMemory(userId, slotNumber, data) {
    try {
      if (slotNumber < 1 || slotNumber > 10) {
        throw new Error('Slot number must be between 1 and 10');
      }

      const [memorySlot, created] = await Memory.upsert({
        userId,
        slotNumber,
        title: data.title,
        content: data.content,
        metadata: data.metadata || {}
      }, {
        returning: true
      });

      return {
        success: true,
        message: created ? 'Memory slot created successfully' : 'Memory slot updated successfully',
        memorySlot
      };
    } catch (error) {
      throw new Error(`Failed to save to memory: ${error.message}`);
    }
  }

  async clearMemorySlot(userId, slotNumber) {
    try {
      if (slotNumber < 1 || slotNumber > 10) {
        throw new Error('Slot number must be between 1 and 10');
      }

      const deleted = await Memory.destroy({
        where: {
          userId,
          slotNumber
        }
      });

      if (deleted === 0) {
        throw new Error('Memory slot not found or already empty');
      }

      return {
        success: true,
        message: 'Memory slot cleared successfully'
      };
    } catch (error) {
      throw new Error(`Failed to clear memory slot: ${error.message}`);
    }
  }
}

// Get history with pagination and filtering
const getHistory = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    startDate,
    endDate,
    type,
    search = '',
    dateFrom = '',
    dateTo = '',
    mode = ''
  } = options;

  // If database is available, try database query first
  if (db && db.all) {
    try {
      let query = 'SELECT * FROM calculation_history WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND expression LIKE ?';
        params.push(`%${search}%`);
      }

      if (dateFrom) {
        query += ' AND timestamp >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ' AND timestamp <= ?';
        params.push(dateTo);
      }

      if (mode) {
        query += ' AND calculation_mode = ?';
        params.push(mode);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);

      const results = await db.all(query, params);
      return results;
    } catch (error) {
      console.error('Database query failed, falling back to file system');
    }
  }

  // Fallback to file system
  let history = await loadHistory();

  // Apply filters
  if (startDate || endDate) {
    history = history.filter(item => {
      const itemDate = new Date(item.timestamp);
      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate && itemDate > new Date(endDate)) return false;
      return true;
    });
  }

  if (type) {
    history = history.filter(item => item.type === type);
  }

  // Apply sorting
  history.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'timestamp') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1;
    } else {
      return aValue > bValue ? 1 : -1;
    }
  });

  // Apply pagination
  const totalItems = history.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedHistory = history.slice(startIndex, endIndex);

  return {
    items: paginatedHistory,
    pagination: {
      total: totalItems,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: totalPages
    }
  };
};

const historyService = new HistoryService();

module.exports = {
  addToHistory,
  deleteHistoryItem,
  clearHistory,
  loadHistory,
  saveHistory,
  getHistory,
  saveToHistory: (userId, data) => historyService.saveToHistory(userId, data),
  getUserHistory: (userId, options) => historyService.getUserHistory(userId, options),
  searchHistory: (userId, searchTerm, options) => historyService.searchHistory(userId, searchTerm, options),
  deleteHistory: (historyId, userId) => historyService.deleteHistory(historyId, userId),
  clearUserHistory: (userId) => historyService.clearUserHistory(userId),
  getMemorySlots: (userId) => historyService.getMemorySlots(userId),
  saveToMemory: (userId, slotNumber, data) => historyService.saveToMemory(userId, slotNumber, data),
  clearMemorySlot: (userId, slotNumber) => historyService.clearMemorySlot(userId, slotNumber),
  createHistory: (userId, data) => historyService.createHistory(userId, data),
  getHistoryById: (historyId, userId) => historyService.getHistoryById(historyId, userId),
  bulkDeleteHistory: (historyIds, userId) => historyService.bulkDeleteHistory(historyIds, userId),
  getHistoryStats: (userId, options) => historyService.getHistoryStats(userId, options)
};
