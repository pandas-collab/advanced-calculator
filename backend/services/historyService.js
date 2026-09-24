const db = require("../config/database.js");
const { Op } = require('sequelize');
const { History, User } = require('../models');
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
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
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
          { metadata: { [Op.iLike]: `%${searchTerm}%` } }
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
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
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
    data: paginatedHistory,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
};

// Search history by expression or result
const searchHistory = async (query, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;

  let history = await loadHistory();

  if (!query || query.trim() === '') {
    return getHistory(options);
  }

  const searchTerm = query.toLowerCase().trim();

  // Search in expression, result, and type fields
  history = history.filter(item => {
    const searchFields = [
      item.expression || '',
      item.result?.toString() || '',
      item.type || '',
      item.unit || ''
    ];

    return searchFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });

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
    data: paginatedHistory,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    query: searchTerm
  };
};

// Save calculation history with expression, result, timestamp, and mode
const saveCalculation = async (expression, result, mode = 'standard') => {
    try {
        if (db && db.run) {
            const query = `
                INSERT INTO calculation_history (expression, result, calculation_mode, timestamp)
                VALUES (?, ?, ?, ?)
            `;
            const timestamp = new Date().toISOString();
            await db.run(query, [expression, result, mode, timestamp]);
            return { success: true, timestamp };
        } else {
            // Fallback to file system
            const calculation = {
                expression,
                result,
                type: mode,
                timestamp: new Date().toISOString()
            };
            const entry = await addToHistory(calculation);
            return { success: true, timestamp: entry.timestamp };
        }
    } catch (error) {
        console.error('Error saving calculation:', error);
        throw error;
    }
};

// Delete history entry
const deleteHistoryEntry = async (id) => {
    try {
        if (db && db.run) {
            await db.run('DELETE FROM calculation_history WHERE id = ?', [id]);
            return { success: true };
        } else {
            // Fallback to file system
            return await deleteHistoryItem(id);
        }
    } catch (error) {
        console.error('Error deleting history entry:', error);
        throw error;
    }
};

// Export history entries
const exportHistory = async (format = 'json') => {
    try {
        let results;
        if (db && db.all) {
            results = await db.all('SELECT * FROM calculation_history ORDER BY timestamp DESC');
        } else {
            results = await loadHistory();
        }
        
        if (format === 'csv') {
            const csv = results.map(row =>
                `${row.timestamp},${row.expression},${row.result},${row.calculation_mode || row.type}`
            ).join('\n');
            return `timestamp,expression,result,mode\n${csv}`;
        }
        return results;
    } catch (error) {
        console.error('Error exporting history:', error);
        throw error;
    }
};

// Get history statistics
const getHistoryStats = async () => {
  const history = await loadHistory();
  
  const stats = {
    totalCalculations: history.length,
    calculationTypes: {},
    recentActivity: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    },
    mostUsedOperations: {},
    averageCalculationsPerDay: 0
  };

  if (history.length === 0) {
    return stats;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Count by type and recent activity
  history.forEach(item => {
    const itemDate = new Date(item.timestamp);
    
    // Count by type
    stats.calculationTypes[item.type] = (stats.calculationTypes[item.type] || 0) + 1;
    
    // Recent activity
    if (itemDate >= today) {
      stats.recentActivity.today++;
    }
    if (itemDate >= weekAgo) {
      stats.recentActivity.thisWeek++;
    }
    if (itemDate >= monthAgo) {
      stats.recentActivity.thisMonth++;
    }

    // Most used operations (extract from expression)
    if (item.expression) {
      const operators = item.expression.match(/[+\-*/^√%]/g) || [];
      operators.forEach(op => {
        stats.mostUsedOperations[op] = (stats.mostUsedOperations[op] || 0) + 1;
      });
    }
  });

  // Calculate average calculations per day
  if (history.length > 0) {
    const oldestDate = new Date(history[history.length - 1].timestamp);
    const daysDiff = Math.max(1, Math.ceil((now - oldestDate) / (1000 * 60 * 60 * 24)));
    stats.averageCalculationsPerDay = Math.round((history.length / daysDiff) * 100) / 100;
  }

  return stats;
};

const historyService = new HistoryService();

module.exports = {
  createHistory: historyService.createHistory.bind(historyService),
  getUserHistory: historyService.getUserHistory.bind(historyService),
  deleteHistory: historyService.deleteHistory.bind(historyService),
  searchHistory,
  getHistoryById: historyService.getHistoryById.bind(historyService),
  bulkDeleteHistory: historyService.bulkDeleteHistory.bind(historyService),
  getHistoryStats,
  addToHistory,
  getHistory,
  deleteHistoryItem,
  clearHistory,
  saveCalculation,
  deleteHistoryEntry,
  exportHistory
};
