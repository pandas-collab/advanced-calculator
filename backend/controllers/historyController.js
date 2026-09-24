const historyService = require('../services/historyService');
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20, userId, sortBy, sortOrder, category, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * limit;
    const finalUserId = req.user?.id || userId;

    if (!finalUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let whereClause = {
      userId: finalUserId
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
      data: history,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const finalUserId = req.user?.id || userId;

    if (!finalUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let whereClause = {
      userId: finalUserId,
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const saveCalculation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.id || req.body.userId;
    const { expression, result, calculationType, metadata } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!expression || result === undefined || result === null) {
      return res.status(400).json({
        success: false,
        message: 'Expression and result are required'
      });
    }

    const calculationData = {
      userId,
      expression,
      result,
      calculationType: calculationType || 'basic',
      metadata: metadata || {},
      timestamp: new Date(),
      createdAt: new Date()
    };

    const savedCalculation = await historyService.saveCalculation(calculationData);

    res.status(201).json({
      success: true,
      message: 'Calculation saved successfully',
      data: savedCalculation
    });
  } catch (error) {
    console.error('Error saving calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save calculation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteHistory = async (req, res) => {
  try {
    const { historyId, id } = req.params;
    const { userId } = req.body;
    const targetId = historyId || id;
    const finalUserId = req.user?.id || userId;

    if (!finalUserId) {
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
        userId: finalUserId
      }
    });

    if (!history) {
      return res.status(404).json({ 
        success: false,
        message: 'History item not found'
      });
    }

    if (history.userId !== finalUserId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this history item'
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteHistoryItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user?.id || req.body.userId || req.query.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'History item ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const item = await historyService.getHistoryItemById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'History item not found'
      });
    }

    if (item.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this history item'
      });
    }

    await historyService.deleteHistoryItem(id);

    res.status(200).json({
      success: true,
      message: 'History item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting history item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete history item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const clearHistory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId, category, dateFrom, dateTo, confirmClear, beforeDate, calculationType } = req.body;
    const finalUserId = req.user?.id || userId || req.query.userId;

    if (!finalUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!confirmClear) {
      return res.status(400).json({
        success: false,
        message: 'Clear confirmation is required'
      });
    }

    let whereClause = { userId: finalUserId };

    // Apply selective clearing based on filters
    if (category) {
      whereClause.category = {
        equals: category,
        mode: 'insensitive'
      };
    }

    if (dateFrom || dateTo || beforeDate) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
      if (beforeDate) whereClause.createdAt.lte = new Date(beforeDate);
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

    // Also use historyService for additional cleanup
    try {
      const clearOptions = {
        userId: finalUserId,
        beforeDate: beforeDate ? new Date(beforeDate) : null,
        calculationType: calculationType || null
      };
      await historyService.clearUserHistory(clearOptions);
    } catch (serviceError) {
      console.warn('Service clear error (non-fatal):', serviceError);
    }

    const afterCount = await prisma.chatHistory.count({
      where: { userId: finalUserId }
    });

    const clearedCount = beforeCount;

    res.json({ 
      success: true,
      message: `Successfully cleared ${clearedCount} history items`,
      deletedCount: clearedCount,
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getHistoryStats = async (req, res) => {
  try {
    const { userId } = req.query;
    const finalUserId = req.user?.id || userId;

    if (!finalUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const totalItems = await prisma.chatHistory.count({
      where: { userId: finalUserId }
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
      where: { userId: finalUserId },
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
        userId: finalUserId,
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
      where: { userId: finalUserId },
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
        userId: finalUserId,
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
    console.error('Error fetching history stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching history stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getHistory,
  searchHistory,
  saveCalculation,
  deleteHistory,
  deleteHistoryItem,
  clearHistory,
  getHistoryStats
};
