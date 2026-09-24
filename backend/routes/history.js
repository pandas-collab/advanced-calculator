const express = require('express');
const router = express.Router();
const History = require('../models/History');
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

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
        limit = 50,
        search,
        type,
        startDate,
        endDate
      } = req.query;

      // Build query
      let query = { userId: req.user.id };

      if (search) {
        query.$or = [
          { query: { $regex: search, $options: 'i' } },
          { 'results.title': { $regex: search, $options: 'i' } }
        ];
      }

      if (type) {
        query.type = type;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get paginated results
      const totalItems = await History.countDocuments(query);
      const totalPages = Math.ceil(totalItems / limit);
      const skip = (page - 1) * limit;

      const history = await History.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          history,
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
        message: 'Failed to fetch history',
        error: error.message
      });
    }
  }
);

// POST /api/history - Create new history entry
router.post('/',
  auth,
  [
    body('query').notEmpty().isString().trim(),
    body('results').optional().isArray(),
    body('filters').optional().isObject(),
    body('title').optional().isLength({ min: 1, max: 200 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('type').optional().isString().trim(),
    body('data').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { query, results, filters, title, description, type, data, metadata } = req.body;
      
      const historyEntry = new History({
        userId: req.user.id,
        query,
        results: results || [],
        filters: filters || {},
        title,
        description,
        type,
        data,
        metadata,
        createdAt: new Date()
      });

      await historyEntry.save();
      
      res.status(201).json({
        success: true,
        message: 'History entry created successfully',
        data: historyEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to save history entry',
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
      const historyEntry = await History.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

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
        message: 'Failed to fetch history entry',
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
    body('metadata').optional().isObject(),
    body('query').optional().isString().trim(),
    body('results').optional().isArray(),
    body('filters').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, type, data, metadata, query, results, filters } = req.body;

      const historyEntry = await History.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!historyEntry) {
        return res.status(404).json({
          success: false,
          message: 'History entry not found'
        });
      }

      // Update fields if provided
      if (title !== undefined) historyEntry.title = title;
      if (description !== undefined) historyEntry.description = description;
      if (type !== undefined) historyEntry.type = type;
      if (data !== undefined) historyEntry.data = data;
      if (metadata !== undefined) historyEntry.metadata = metadata;
      if (query !== undefined) historyEntry.query = query;
      if (results !== undefined) historyEntry.results = results;
      if (filters !== undefined) historyEntry.filters = filters;

      historyEntry.updatedAt = new Date();

      await historyEntry.save();

      res.json({
        success: true,
        message: 'History entry updated successfully',
        data: historyEntry
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

// DELETE /api/history/:id - Delete specific history entry
router.delete('/:id',
  auth,
  async (req, res) => {
    try {
      const historyEntry = await History.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!historyEntry) {
        return res.status(404).json({
          success: false,
          message: 'History entry not found'
        });
      }

      res.json({
        success: true,
        message: 'History entry deleted successfully',
        data: historyEntry
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
      const result = await History.deleteMany({ userId: req.user.id });
      
      res.json({
        success: true,
        message: `Cleared ${result.deletedCount} history entries`,
        data: {
          deletedCount: result.deletedCount
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

// GET /api/history/stats/summary - Get history statistics for user
router.get('/stats/summary',
  auth,
  async (req, res) => {
    try {
      const userHistory = await History.find({ userId: req.user.id }).sort({ createdAt: -1 });
      
      const stats = {
        totalEntries: userHistory.length,
        typeBreakdown: {},
        recentActivity: userHistory.slice(0, 5),
        oldestEntry: userHistory.length > 0 ? 
          userHistory[userHistory.length - 1] : null,
        newestEntry: userHistory.length > 0 ? 
          userHistory[0] : null
      };

      // Calculate type breakdown
      userHistory.forEach(entry => {
        const entryType = entry.type || 'default';
        stats.typeBreakdown[entryType] = (stats.typeBreakdown[entryType] || 0) + 1;
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
