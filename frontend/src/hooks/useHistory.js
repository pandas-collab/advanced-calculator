import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { historyService } from '../services/historyService';
import { replayCalculation } from "../services/historyService.js";
import { HISTORY_CONFIG } from "../utils/constants";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const STORAGE_KEY = 'calculator_history';
const MAX_HISTORY_ITEMS = 100;

const useHistory = (options = {}) => {
  const {
    pageSize = 20,
    autoRefresh = false,
    refreshInterval = 30000,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const [replayCallback, setReplayCallback] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    type: null,
    status: null
  });

  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Error loading history from localStorage:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving history to localStorage:', error);
    }
  }, [history]);

  // Detect calculation type based on expression
  const detectCalculationType = useCallback((expression) => {
    if (!expression) return 'basic';
    
    const trigFunctions = /sin|cos|tan|asin|acos|atan/i;
    const logFunctions = /log|ln/i;
    const powerFunctions = /\^|\*\*|sqrt|cbrt/i;
    const basicOperators = /[+\-*/]/;
    
    if (trigFunctions.test(expression)) return 'trigonometry';
    if (logFunctions.test(expression)) return 'logarithmic';
    if (powerFunctions.test(expression)) return 'exponential';
    if (basicOperators.test(expression)) return 'basic';
    
    return 'basic';
  }, []);

  const fetchHistory = useCallback(async (page = 1, search = '', filterParams = {}, append = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (!append) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const params = {
        page,
        limit: pagination.limit || pageSize,
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...filterParams,
        ...filters
      };

      // Try API first, fallback to historyService
      let response;
      try {
        const axiosResponse = await axios.get(`${API_BASE_URL}/history`, { 
          params,
          signal: abortControllerRef.current.signal 
        });
        response = {
          data: axiosResponse.data.data || [],
          pagination: axiosResponse.data.pagination || {}
        };
      } catch (apiError) {
        // Fallback to historyService
        response = await historyService.getHistory(params, {
          signal: abortControllerRef.current.signal
        });
      }

      const { data, pagination: paginationData } = response;

      if (append && page > 1) {
        setHistory(prev => [...prev, ...data]);
      } else {
        setHistory(data || []);
      }

      const paginationUpdate = {
        page: paginationData?.page || page,
        total: paginationData?.total || 0,
        totalPages: paginationData?.totalPages || 0,
        hasNext: paginationData?.hasNext
      };

      setPagination(prev => ({
        ...prev,
        ...paginationUpdate
      }));

      setTotalCount(paginationData?.total || 0);
      setHasMore(paginationData?.hasNext || false);
      setCurrentPage(page);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.message || err.message || 'Failed to fetch history');
        console.error('Error fetching history:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.limit, pageSize, sortBy, sortOrder, filters]);

  // Add new calculation to history
  const addToHistory = useCallback((expression, result) => {
    if (!expression || result === undefined || result === null) return;
    
    const newEntry = {
      id: Date.now(),
      expression: expression.toString(),
      result: result.toString(),
      timestamp: new Date().toISOString(),
      type: detectCalculationType(expression)
    };

    setHistory(prevHistory => {
      const updatedHistory = [newEntry, ...prevHistory];
      // Limit history size
      return updatedHistory.slice(0, MAX_HISTORY_ITEMS);
    });
  }, [detectCalculationType]);

  const addHistoryItem = useCallback(async (item) => {
    try {
      setError(null);
      const newItem = await historyService.createHistoryItem(item);
      setHistory(prev => [newItem, ...prev]);
      setTotalCount(prev => prev + 1);
      return newItem;
    } catch (err) {
      setError(err.message || 'Failed to add history item');
      throw err;
    }
  }, []);

  const updateHistoryItem = useCallback(async (id, updates) => {
    try {
      setError(null);
      const updatedItem = await historyService.updateHistoryItem(id, updates);
      setHistory(prev => 
        prev.map(item => item.id === id ? updatedItem : item)
      );
      return updatedItem;
    } catch (err) {
      setError(err.message || 'Failed to update history item');
      throw err;
    }
  }, []);

  const searchHistory = useCallback((query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
    setCurrentPage(1);
    fetchHistory(1, query, filters);
  }, [fetchHistory, filters]);

  const filterHistory = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    setCurrentPage(1);
    fetchHistory(1, searchQuery, newFilters);
  }, [fetchHistory, searchQuery]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchHistory(page, searchQuery, filters);
    }
  }, [fetchHistory, pagination.totalPages, searchQuery, filters]);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.page, goToPage]);

  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      fetchHistory(currentPage + 1, searchQuery, filters, true);
    }
  }, [loading, refreshing, hasMore, currentPage, searchQuery, filters, fetchHistory]);

  const refresh = useCallback(() => {
    fetchHistory(1, searchQuery, filters, false);
  }, [fetchHistory, searchQuery, filters]);

  const deleteHistoryItem = useCallback(async (id) => {
    try {
      setLoading(true);
      
      // Try API first, fallback to historyService
      try {
        await axios.delete(`${API_BASE_URL}/history/${id}`);
      } catch (apiError) {
        await historyService.deleteHistoryItem(id);
      }
      
      // Remove item from local state
      setHistory(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
      
      // Adjust pagination if needed
      if (history.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1);
      } else {
        // Refresh current page to get accurate counts
        fetchHistory(pagination.page, searchQuery, filters);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete history item');
      console.error('Error deleting history item:', err);
    } finally {
      setLoading(false);
    }
  }, [history.length, pagination.page, searchQuery, filters, fetchHistory, goToPage]);

  // Remove specific history item (local only)
  const removeHistoryItem = useCallback((id) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try API first, fallback to historyService
      try {
        await axios.delete(`${API_BASE_URL}/history`);
      } catch (apiError) {
        await historyService.clearHistory(filters);
      }
      
      setHistory([]);
      setSearchQuery('');
      setFilterType('all');
      setPagination(prev => ({
        ...prev,
        page: 1,
        total: 0,
        totalPages: 0
      }));
      setTotalCount(0);
      setHasMore(false);
      setCurrentPage(1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to clear history');
      console.error('Error clearing history:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const exportHistory = useCallback(async (format = 'csv') => {
    try {
      setLoading(true);
      
      // Try API first
      try {
        const response = await axios.get(`${API_BASE_URL}/history/export`, {
          params: { format, ...filters },
          responseType: 'blob'
        });

        const blob = new Blob([response.data], {
          type: format === 'csv' ? 'text/csv' : 'application/json'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `history.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (apiError) {
        // Fallback to local export
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `calculator_history_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to export history');
      console.error('Error exporting history:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, history]);

  const refreshHistory = useCallback(() => {
    fetchHistory(pagination.page, searchQuery, filters);
  }, [fetchHistory, pagination.page, searchQuery, filters]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setFilters({
      dateFrom: null,
      dateTo: null,
      type: null,
      status: null
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setCurrentPage(1);
    fetchHistory(1, '', {});
  }, [fetchHistory]);

  // Import history from JSON
  const importHistory = useCallback((jsonString) => {
    try {
      const importedHistory = JSON.parse(jsonString);
      if (Array.isArray(importedHistory)) {
        // Validate imported data structure
        const validHistory = importedHistory.filter(item => 
          item && 
          typeof item.expression === 'string' && 
          typeof item.result === 'string' &&
          item.timestamp &&
          item.id
        );
        
        setHistory(validHistory.slice(0, MAX_HISTORY_ITEMS));
        return true;
      }
    } catch (error) {
      console.error('Error importing history:', error);
    }
    return false;
  }, []);

  // Replay calculation functionality
  const replayCalculation = useCallback((historyItem) => {
    if (replayCallback) {
      replayCallback(historyItem.expression, historyItem.calculation_mode);
    }
  }, [replayCallback]);

  // Set callback for replay functionality
  const setOnReplayCalculation = useCallback((callback) => {
    setReplayCallback(() => callback);
  }, []);

  // Add replay functionality to the hook
  const replay = useCallback(async (historyItem) => {
    try {
      setLoading(true);
      const result = await replayCalculation(historyItem);

      // Refresh history to show the new replayed calculation
      await fetchHistory();

      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchHistory]);

  // Filter and search history
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Search in expression and result
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.expression.toLowerCase().includes(query) ||
        item.result.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [history, searchQuery, filterType]);

  // Get history statistics
  const historyStats = useMemo(() => {
    const stats = {
      total: history.length,
      byType: {
        basic: 0,
        trigonometry: 0,
        logarithmic: 0,
        exponential: 0
      }
    };

    history.forEach(item => {
      if (stats.byType.hasOwnProperty(item.type)) {
        stats.byType[item.type]++;
      }
    });

    return stats;
  }, [history]);

  // Get recent calculations (last 10)
  const recentCalculations = useMemo(() => {
    return history.slice(0, 10);
  }, [history]);

  // Setup real-time updates
  useEffect(() => {
    const handleHistoryUpdate = (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'created':
          setHistory(prev => [data, ...prev]);
          setTotalCount(prev => prev + 1);
          break;
        case 'updated':
          setHistory(prev => 
            prev.map(item => item.id === data.id ? data : item)
          );
          break;
        case 'deleted':
          setHistory(prev => prev.filter(item => item.id !== data.id));
          setTotalCount(prev => prev - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('historyUpdate', handleHistoryUpdate);
    return () => {
      window.removeEventListener('historyUpdate', handleHistoryUpdate);
    };
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchHistory(1, searchQuery, filters, false);
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchHistory, searchQuery, filters]);

  // Initial load
  useEffect(() => {
    fetchHistory();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Replay functionality
    replayCalculation,
    setOnReplayCalculation,
    replay,
    
    // State
    history: filteredHistory,
    loading,
    error,
    hasMore,
    currentPage,
    totalCount,
    refreshing,
    pagination,
    searchQuery,
    filterType,
    filters,
    historyStats,
    recentCalculations,
    
    // Actions
    addToHistory,
    addHistoryItem,
    updateHistoryItem,
    fetchHistory,
    searchHistory,
    filterHistory,
    deleteHistoryItem,
    removeHistoryItem,
    clearHistory,
    exportHistory,
    importHistory,
    refreshHistory,
    resetFilters,
    loadMore,
    refresh,
    setSearchQuery,
    setFilterType,
    
    // Pagination actions
    goToPage,
    nextPage,
    prevPage,
    
    // Utilities
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1,
    isEmpty: history.length === 0 && !loading,
    isFirstLoad: loading && pagination.page === 1 && history.length === 0,
    hasHistory: history.length > 0
  };
};

export { useHistory };
export default useHistory;
