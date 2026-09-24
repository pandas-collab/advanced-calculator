const { validationResult } = require('express-validator');
const History = require("../models/History");
const Calculation = require("../models/Calculation");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock database - replace with actual database implementation
let historyData = [];
let historyIdCounter = 1;

const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, sortBy, sortOrder, category, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let whereClause = {
      userId: userId
    };

    // Apply category filter if provided
    if (category) {
      whereClause.category = {
        equals: category,
        mode: 'insensitive'
      };
    }

    // Apply date range filter if provided
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = { [sortBy]: order };
    }

    const history = await prisma.chatHistory.findMany({
      where: whereClause,
      orderBy: orderBy,
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    const total = await prisma.chatHistory.count({
      where: whereClause
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving history',
      error: error.message
    });
  }
};

const searchHistory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { q: query, userId, page = 1, limit = 20, category } = req.query;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let whereClause = {
      userId: userId,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          messages: {
            some: {
              content: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        }
      ]
    };

    // Apply category filter if provided
    if (category) {
      whereClause.category = {
        equals: category,
        mode: 'insensitive'
      };
    }

    const history = await prisma.chatHistory.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    const total = await prisma.chatHistory.count({
      where: whereClause
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        results: history,
        searchQuery: query,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error searching history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error searching history',
      error: error.message
    });
  }
};

const deleteHistory = async (req, res) => {
  try {
    const { historyId, id } = req.params;
    const { userId } = req.body;
    const targetId = historyId || id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: 'History ID is required'
      });
    }

    const history = await prisma.chatHistory.findFirst({
      where: {
        id: targetId,
        userId: userId
      }
    });

    if (!history) {
      return res.status(404).json({ 
        success: false,
        message: 'History item not found'
      });
    }

    await prisma.message.deleteMany({
      where: {
        chatHistoryId: targetId
      }
    });

    await prisma.chatHistory.delete({
      where: {
        id: targetId
      }
    });

    res.json({ 
      success: true,
      message: 'History item deleted successfully',
      data: {
        deletedItem: history
      }
    });
  } catch (error) {
    console.error('Error deleting history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting history item',
      error: error.message
    });
  }
};

const clearHistory = async (req, res) => {
  try {
    const { userId, category, dateFrom, dateTo, confirmClear } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!confirmClear) {
      return res.status(400).json({
        success: false,
        message: 'Clear confirmation is required'
      });
    }

    let whereClause = { userId: userId };

    // Apply selective clearing based on filters
    if (category) {
      whereClause.category = {
        equals: category,
        mode: 'insensitive'
      };
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    const beforeCount = await prisma.chatHistory.count({
      where: whereClause
    });

    const userHistory = await prisma.chatHistory.findMany({
      where: whereClause,
      select: {
        id: true
      }
    });

    const historyIds = userHistory.map(h => h.id);

    await prisma.message.deleteMany({
      where: {
        chatHistoryId: {
          in: historyIds
        }
      }
    });

    await prisma.chatHistory.deleteMany({
      where: whereClause
    });

    const afterCount = await prisma.chatHistory.count({
      where: { userId: userId }
    });

    const clearedCount = beforeCount;

    res.json({ 
      success: true,
      message: `Successfully cleared ${clearedCount} history items`,
      data: {
        clearedCount,
        remainingCount: afterCount
      }
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error clearing history',
      error: error.message
    });
  }
};

const getHistoryStats = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const totalItems = await prisma.chatHistory.count({
      where: { userId: userId }
    });
    
    if (totalItems === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalItems: 0,
          categoryBreakdown: {},
          recentActivity: [],
          dateRange: null,
          activityByDay: {},
          recentActivityCount: 0
        }
      });
    }

    // Category breakdown
    const categoryBreakdown = {};
    const categories = await prisma.chatHistory.groupBy({
      by: ['category'],
      where: { userId: userId },
      _count: { category: true }
    });
    
    categories.forEach(item => {
      const category = item.category || 'uncategorized';
      categoryBreakdown[category] = item._count.category;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await prisma.chatHistory.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Date range
    const dateStats = await prisma.chatHistory.aggregate({
      where: { userId: userId },
      _min: { createdAt: true },
      _max: { createdAt: true }
    });

    // Activity by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityByDay = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      activityByDay[dateStr] = 0;
    }

    const dailyActivity = await prisma.chatHistory.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true
      }
    });

    dailyActivity.forEach(item => {
      const dateStr = item.createdAt.toISOString().split('T')[0];
      if (activityByDay[dateStr] !== undefined) {
        activityByDay[dateStr]++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        categoryBreakdown,
        recentActivity,
        dateRange: {
          oldest: dateStats._min.createdAt,
          newest: dateStats._max.createdAt
        },
        activityByDay,
        recentActivityCount: recentActivity.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving history statistics',
      error: error.message
    });
  }
};

const getMemory = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const memory = await prisma.userMemory.findUnique({
      where: {
        userId: userId
      }
    });

    if (!memory) {
      return res.json({ memory: null });
    }

    res.json({ memory: memory.content });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
};

const saveMemory = async (req, res) => {
  try {
    const { userId, memory } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!memory) {
      return res.status(400).json({ error: 'Memory content is required' });
    }

    const savedMemory = await prisma.userMemory.upsert({
      where: {
        userId: userId
      },
      update: {
        content: memory,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        content: memory
      }
    });

    res.json({ 
      message: 'Memory saved successfully',
      memory: savedMemory.content
    });
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({ error: 'Failed to save memory' });
  }
};

const clearMemory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await prisma.userMemory.deleteMany({
      where: {
        userId: userId
      }
    });

    res.json({ message: 'Memory cleared successfully' });
  } catch (error) {
    console.error('Error clearing memory:', error);
    res.status(500).json({ error: 'Failed to clear memory' });
  }
};

module.exports = {
  getHistory,
  searchHistory,
  deleteHistory,
  clearHistory,
  getHistoryStats,
  getMemory,
  saveMemory,
  clearMemory
};
