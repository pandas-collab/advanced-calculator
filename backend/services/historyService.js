const db = require("../config/database.js");
const { Op } = require('sequelize');
const { History, User } = require('../models');

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

const historyService = new HistoryService();

module.exports = {
  createHistory: historyService.createHistory.bind(historyService),
  getUserHistory: historyService.getUserHistory.bind(historyService),
  deleteHistory: historyService.deleteHistory.bind(historyService),
  searchHistory: historyService.searchHistory.bind(historyService),
  getHistoryById: historyService.getHistoryById.bind(historyService),
  bulkDeleteHistory: historyService.bulkDeleteHistory.bind(historyService),
  getHistoryStats: historyService.getHistoryStats.bind(historyService)
};
// Save calculation history with expression, result, timestamp, and mode
const saveCalculation = async (expression, result, mode = 'standard') => {
    try {
        const query = `
            INSERT INTO calculation_history (expression, result, calculation_mode, timestamp)
            VALUES (?, ?, ?, ?)
        `;
        const timestamp = new Date().toISOString();
        await db.run(query, [expression, result, mode, timestamp]);
        return { success: true, timestamp };
    } catch (error) {
        console.error('Error saving calculation:', error);
        throw error;
    }
};

// Get history with pagination and filtering
const getHistory = async (page = 1, limit = 10, search = '', dateFrom = '', dateTo = '', mode = '') => {
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
        console.error('Error getting history:', error);
        throw error;
    }
};

// Delete history entry
const deleteHistoryEntry = async (id) => {
    try {
        await db.run('DELETE FROM calculation_history WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting history entry:', error);
        throw error;
    }
};

// Export history entries
const exportHistory = async (format = 'json') => {
    try {
        const results = await db.all('SELECT * FROM calculation_history ORDER BY timestamp DESC');
        if (format === 'csv') {
            const csv = results.map(row =>
                `${row.timestamp},${row.expression},${row.result},${row.calculation_mode}`
            ).join('\n');
            return `timestamp,expression,result,mode\n${csv}`;
        }
        return results;
    } catch (error) {
        console.error('Error exporting history:', error);
        throw error;
    }
};

module.exports = {
    saveCalculation,
    getHistory,
    deleteHistoryEntry,
    exportHistory
};
