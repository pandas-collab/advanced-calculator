const { History, Memory } = require('../models');
const { Op } = require('sequelize');

class HistoryService {
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
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;

      const result = await History.findAndCountAll({
        where: { userId },
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: ['id', 'query', 'response', 'metadata', 'timestamp']
      });

      return {
        items: result.rows,
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get user history: ${error.message}`);
    }
  }

  async searchHistory(userId, searchTerm, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'timestamp',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;

      const whereClause = {
        userId,
        [Op.or]: [
          {
            query: {
              [Op.iLike]: `%${searchTerm}%`
            }
          },
          {
            response: {
              [Op.iLike]: `%${searchTerm}%`
            }
          }
        ]
      };

      const result = await History.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: ['id', 'query', 'response', 'metadata', 'timestamp']
      });

      return {
        items: result.rows,
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit),
        searchTerm
      };
    } catch (error) {
      throw new Error(`Failed to search history: ${error.message}`);
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

const historyService = new HistoryService();

module.exports = {
  saveToHistory: (userId, data) => historyService.saveToHistory(userId, data),
  getUserHistory: (userId, options) => historyService.getUserHistory(userId, options),
  searchHistory: (userId, searchTerm, options) => historyService.searchHistory(userId, searchTerm, options),
  deleteHistoryItem: (userId, historyId) => historyService.deleteHistoryItem(userId, historyId),
  clearUserHistory: (userId) => historyService.clearUserHistory(userId),
  getMemorySlots: (userId) => historyService.getMemorySlots(userId),
  saveToMemory: (userId, slotNumber, data) => historyService.saveToMemory(userId, slotNumber, data),
  clearMemorySlot: (userId, slotNumber) => historyService.clearMemorySlot(userId, slotNumber)
};