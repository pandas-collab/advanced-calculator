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

// Get history with pagination and filtering
const getHistory = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    startDate,
    endDate,
    type
  } = options;

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

module.exports = {
  getHistory,
  searchHistory,
  deleteHistoryItem,
  clearHistory,
  getHistoryStats,
  addToHistory
};