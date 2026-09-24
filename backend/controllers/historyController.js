const historyService = require('../services/historyService');
const { validationResult } = require('express-validator');

const getHistory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.id || req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = req.query.filter || {};
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const historyData = await historyService.getUserHistory(userId, {
      page,
      limit,
      filter,
      sortBy,
      sortOrder
    });

    res.status(200).json({
      success: true,
      data: historyData.items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(historyData.total / limit),
        totalItems: historyData.total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(historyData.total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve history',
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

    const userId = req.user?.id || req.body.userId || req.query.userId;
    const { beforeDate, calculationType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const clearOptions = {
      userId,
      beforeDate: beforeDate ? new Date(beforeDate) : null,
      calculationType: calculationType || null
    };

    const deletedCount = await historyService.clearUserHistory(clearOptions);

    res.status(200).json({
      success: true,
      message: `History cleared successfully. ${deletedCount} items deleted.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getHistory,
  saveCalculation,
  deleteHistoryItem,
  clearHistory
};