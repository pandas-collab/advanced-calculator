const { validationResult } = require('express-validator');

// Mock database - replace with actual database implementation
let historyData = [];
let historyIdCounter = 1;

const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const category = req.query.category;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    let filteredHistory = [...historyData];

    // Apply category filter
    if (category) {
      filteredHistory = filteredHistory.filter(item => 
        item.category && item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply date range filter
    if (dateFrom || dateTo) {
      filteredHistory = filteredHistory.filter(item => {
        const itemDate = new Date(item.createdAt);
        if (dateFrom && itemDate < new Date(dateFrom)) return false;
        if (dateTo && itemDate > new Date(dateTo)) return false;
        return true;
      });
    }

    // Sort history
    filteredHistory.sort((a, b) => {
      if (sortBy === 'createdAt') {
        return (new Date(a.createdAt) - new Date(b.createdAt)) * sortOrder;
      }
      return (a[sortBy] || '').localeCompare(b[sortBy] || '') * sortOrder;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    const totalItems = filteredHistory.length;
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNextPage: endIndex < totalItems,
          hasPrevPage: startIndex > 0
        }
      }
    });
  } catch (error) {
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

    const { q: query, page = 1, limit = 10, category } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = query.toLowerCase().trim();
    let searchResults = historyData.filter(item => {
      const matchesQuery = 
        (item.title && item.title.toLowerCase().includes(searchTerm)) ||
        (item.description && item.description.toLowerCase().includes(searchTerm)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
        (item.content && item.content.toLowerCase().includes(searchTerm));

      const matchesCategory = !category || 
        (item.category && item.category.toLowerCase() === category.toLowerCase());

      return matchesQuery && matchesCategory;
    });

    // Sort by relevance (exact matches first, then partial matches)
    searchResults.sort((a, b) => {
      const aExact = (a.title && a.title.toLowerCase() === searchTerm) ||
                    (a.description && a.description.toLowerCase() === searchTerm);
      const bExact = (b.title && b.title.toLowerCase() === searchTerm) ||
                    (b.description && b.description.toLowerCase() === searchTerm);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = searchResults.slice(startIndex, endIndex);

    const totalItems = searchResults.length;
    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      success: true,
      data: {
        results: paginatedResults,
        searchQuery: query,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          hasNextPage: endIndex < totalItems,
          hasPrevPage: startIndex > 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching history',
      error: error.message
    });
  }
};

const deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'History ID is required'
      });
    }

    const historyIndex = historyData.findIndex(item => item.id === parseInt(id));
    
    if (historyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'History item not found'
      });
    }

    const deletedItem = historyData.splice(historyIndex, 1)[0];

    res.status(200).json({
      success: true,
      message: 'History item deleted successfully',
      data: {
        deletedItem
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting history item',
      error: error.message
    });
  }
};

const clearHistory = async (req, res) => {
  try {
    const { category, dateFrom, dateTo, confirmClear } = req.body;

    if (!confirmClear) {
      return res.status(400).json({
        success: false,
        message: 'Clear confirmation is required'
      });
    }

    const beforeCount = historyData.length;
    let itemsToKeep = [];

    if (category || dateFrom || dateTo) {
      // Selective clearing based on filters
      itemsToKeep = historyData.filter(item => {
        // Keep items that don't match the clearing criteria
        if (category && item.category && item.category.toLowerCase() === category.toLowerCase()) {
          return false;
        }
        
        if (dateFrom || dateTo) {
          const itemDate = new Date(item.createdAt);
          if (dateFrom && dateTo) {
            if (itemDate >= new Date(dateFrom) && itemDate <= new Date(dateTo)) {
              return false;
            }
          } else if (dateFrom && itemDate >= new Date(dateFrom)) {
            return false;
          } else if (dateTo && itemDate <= new Date(dateTo)) {
            return false;
          }
        }

        return true;
      });
      
      historyData = itemsToKeep;
    } else {
      // Clear all history
      historyData = [];
    }

    const afterCount = historyData.length;
    const clearedCount = beforeCount - afterCount;

    res.status(200).json({
      success: true,
      message: `Successfully cleared ${clearedCount} history items`,
      data: {
        clearedCount,
        remainingCount: afterCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing history',
      error: error.message
    });
  }
};

const getHistoryStats = async (req, res) => {
  try {
    const totalItems = historyData.length;
    
    if (totalItems === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalItems: 0,
          categoryBreakdown: {},
          recentActivity: [],
          dateRange: null
        }
      });
    }

    // Category breakdown
    const categoryBreakdown = {};
    historyData.forEach(item => {
      const category = item.category || 'uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = historyData
      .filter(item => new Date(item.createdAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Date range
    const dates = historyData.map(item => new Date(item.createdAt));
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));

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

    historyData.forEach(item => {
      const itemDate = new Date(item.createdAt);
      if (itemDate >= thirtyDaysAgo) {
        const dateStr = itemDate.toISOString().split('T')[0];
        if (activityByDay[dateStr] !== undefined) {
          activityByDay[dateStr]++;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        categoryBreakdown,
        recentActivity,
        dateRange: {
          oldest: oldestDate,
          newest: newestDate
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

module.exports = {
  getHistory,
  searchHistory,
  deleteHistory,
  clearHistory,
  getHistoryStats
};