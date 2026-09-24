const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

// Mock database - replace with actual database implementation
let historyData = [];
let currentId = 1;

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/history - Get paginated history with optional filters
router.get('/', 
  auth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('type').optional().isString().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        startDate,
        endDate
      } = req.query;

      // Filter history by user
      let userHistory = historyData.filter(item => item.userId === req.user.id);

      // Apply filters
      if (search) {
        userHistory = userHistory.filter(item => 
          item.title?.toLowerCase().includes(search.toLowerCase()) ||
          item.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (type) {
        userHistory = userHistory.filter(item => item.type === type);
      }

      if (startDate) {
        userHistory = userHistory.filter(item => 
          new Date(item.createdAt) >= new Date(startDate)
        );
      }

      if (endDate) {
        userHistory = userHistory.filter(item => 
          new Date(item.createdAt) <= new Date(endDate)
        );
      }

      // Sort by creation date (newest first)
      userHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedHistory = userHistory.slice(startIndex, endIndex);

      const totalItems = userHistory.length;
      const totalPages = Math.ceil(totalItems / limit);
      const hasNextPage = endIndex < totalItems;
      const hasPrevPage = startIndex > 0;

      res.json({
        success: true,
        data: {
          history: paginatedHistory,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage,
            hasPrevPage
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve history',
        error: error.message
      });
    }
  }
);

// POST /api/history - Create new history entry
router.post('/',
  auth,
  [
    body('title').notEmpty().isLength({ min: 1, max: 200 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('type').notEmpty().isString().trim(),
    body('data').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, type, data, metadata } = req.body;

      const newHistoryEntry = {
        id: currentId++,
        userId: req.user.id,
        title,
        description: description || '',
        type,
        data: data || {},
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      historyData.push(newHistoryEntry);

      res.status(201).json({
        success: true,
        message: 'History entry created successfully',
        data: newHistoryEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create history entry',
        error: error.message
      });
    }
  }
);

// GET /api/history/:id - Get specific history entry
router.get('/:id',
  auth,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid history ID'
        });
      }

      const historyEntry = historyData.find(item => 
        item.id === id && item.userId === req.user.id
      );

      if (!historyEntry) {
        return res.status(404).json({
          success: false,
          message: 'History entry not found'
        });
      }

      res.json({
        success: true,
        data: historyEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve history entry',
        error: error.message
      });
    }
  }
);

// PUT /api/history/:id - Update history entry
router.put('/:id',
  auth,
  [
    body('title').optional().isLength({ min: 1, max: 200 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('type').optional().isString().trim(),
    body('data').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid history ID'
        });
      }

      const historyIndex = historyData.findIndex(item => 
        item.id === id && item.userId === req.user.id
      );

      if (historyIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'History entry not found'
        });
      }

      const { title, description, type, data, metadata } = req.body;
      const existingEntry = historyData[historyIndex];

      const updatedEntry = {
        ...existingEntry,
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(data && { data }),
        ...(metadata && { metadata }),
        updatedAt: new Date().toISOString()
      };

      historyData[historyIndex] = updatedEntry;

      res.json({
        success: true,
        message: 'History entry updated successfully',
        data: updatedEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update history entry',
        error: error.message
      });
    }
  }
);

// DELETE /api/history/:id - Delete history entry
router.delete('/:id',
  auth,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid history ID'
        });
      }

      const historyIndex = historyData.findIndex(item => 
        item.id === id && item.userId === req.user.id
      );

      if (historyIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'History entry not found'
        });
      }

      const deletedEntry = historyData.splice(historyIndex, 1)[0];

      res.json({
        success: true,
        message: 'History entry deleted successfully',
        data: deletedEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete history entry',
        error: error.message
      });
    }
  }
);

// DELETE /api/history - Clear all history for user
router.delete('/',
  auth,
  async (req, res) => {
    try {
      const userHistoryCount = historyData.filter(item => item.userId === req.user.id).length;
      
      historyData = historyData.filter(item => item.userId !== req.user.id);

      res.json({
        success: true,
        message: `Cleared ${userHistoryCount} history entries`,
        data: {
          deletedCount: userHistoryCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to clear history',
        error: error.message
      });
    }
  }
);

// GET /api/history/stats - Get history statistics for user
router.get('/stats/summary',
  auth,
  async (req, res) => {
    try {
      const userHistory = historyData.filter(item => item.userId === req.user.id);
      
      const stats = {
        totalEntries: userHistory.length,
        typeBreakdown: {},
        recentActivity: userHistory
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
        oldestEntry: userHistory.length > 0 ? 
          userHistory.reduce((oldest, current) => 
            new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
          ) : null,
        newestEntry: userHistory.length > 0 ? 
          userHistory.reduce((newest, current) => 
            new Date(current.createdAt) > new Date(newest.createdAt) ? current : newest
          ) : null
      };

      // Calculate type breakdown
      userHistory.forEach(entry => {
        stats.typeBreakdown[entry.type] = (stats.typeBreakdown[entry.type] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve history statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;