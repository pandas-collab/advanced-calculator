import { useState, useEffect, useCallback, useRef } from 'react';
import { historyService } from '../services/historyService';
import { replayCalculation } from "../services/historyService.js";

const useHistory = (options = {}) => {
  const {
    pageSize = 20,
    autoRefresh = false,
    refreshInterval = 30000,
    filters = {},
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchHistory = useCallback(async (page = 1, append = false) => {
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
        limit: pageSize,
        sortBy,
        sortOrder,
        ...filters
      };

      const response = await historyService.getHistory(params, {
        signal: abortControllerRef.current.signal
      });

      const { data, pagination } = response;

      if (append && page > 1) {
        setHistory(prev => [...prev, ...data]);
      } else {
        setHistory(data);
      }

      setTotalCount(pagination.total);
      setHasMore(pagination.hasNext);
      setCurrentPage(page);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch history');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pageSize, sortBy, sortOrder, filters]);

  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      fetchHistory(currentPage + 1, true);
    }
  }, [loading, refreshing, hasMore, currentPage, fetchHistory]);

  const refresh = useCallback(() => {
    fetchHistory(1, false);
  }, [fetchHistory]);

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

  const deleteHistoryItem = useCallback(async (id) => {
    try {
      setError(null);
      await historyService.deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      setError(err.message || 'Failed to delete history item');
      throw err;
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await historyService.clearHistory(filters);
      setHistory([]);
      setTotalCount(0);
      setHasMore(false);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Failed to clear history');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const searchHistory = useCallback(async (query) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        query,
        page: 1,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...filters
      };

      const response = await historyService.searchHistory(params);
      const { data, pagination } = response;

      setHistory(data);
      setTotalCount(pagination.total);
      setHasMore(pagination.hasNext);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Failed to search history');
    } finally {
      setLoading(false);
    }
  }, [pageSize, sortBy, sortOrder, filters]);

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
        fetchHistory(1, false);
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchHistory]);

  // Initial load
  useEffect(() => {
    fetchHistory(1, false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchHistory]);

  return {
    replay,
    history,
    loading,
    error,
    hasMore,
    currentPage,
    totalCount,
    refreshing,
    loadMore,
    refresh,
    addHistoryItem,
    updateHistoryItem,
    deleteHistoryItem,
    clearHistory,
    searchHistory
  };
};

export { useHistory };
  // Add replay functionality to the hook
  const replay = async (historyItem) => {
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
  };

  // Update the return statement to include replay (if not already present)
