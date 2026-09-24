import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const useHistory = () => {
  const [replayCallback, setReplayCallback] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    type: null,
    status: null
  });

  const fetchHistory = useCallback(async (page = 1, search = '', filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
        ...(search && { search }),
        ...filterParams
      };

      const response = await axios.get(`${API_BASE_URL}/history`, { params });
      
      setHistory(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        page: response.data.pagination?.page || page,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch history');
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  const searchHistory = useCallback((query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchHistory(1, query, filters);
  }, [fetchHistory, filters]);

  const filterHistory = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const deleteHistoryItem = useCallback(async (id) => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/history/${id}`);
      
      // Remove item from local state
      setHistory(prev => prev.filter(item => item.id !== id));
      
      // Adjust pagination if needed
      if (history.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1);
      } else {
        // Refresh current page to get accurate counts
        fetchHistory(pagination.page, searchQuery, filters);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete history item');
      console.error('Error deleting history item:', err);
    } finally {
      setLoading(false);
    }
  }, [history.length, pagination.page, searchQuery, filters, fetchHistory, goToPage]);

  const clearHistory = useCallback(async () => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/history`);
      
      setHistory([]);
      setPagination(prev => ({
        ...prev,
        page: 1,
        total: 0,
        totalPages: 0
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear history');
      console.error('Error clearing history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportHistory = useCallback(async (format = 'csv') => {
    try {
      setLoading(true);
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export history');
      console.error('Error exporting history:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const refreshHistory = useCallback(() => {
    fetchHistory(pagination.page, searchQuery, filters);
  }, [fetchHistory, pagination.page, searchQuery, filters]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({
      dateFrom: null,
      dateTo: null,
      type: null,
      status: null
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchHistory(1, '', {});
  }, [fetchHistory]);

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    replayCalculation,
    setOnReplayCalculation,
    // State
    history,
    loading,
    error,
    pagination,
    searchQuery,
    filters,
    
    // Actions
    fetchHistory,
    searchHistory,
    filterHistory,
    deleteHistoryItem,
    clearHistory,
    exportHistory,
    refreshHistory,
    resetFilters,
    
    // Pagination actions
    goToPage,
    nextPage,
    prevPage,
    
    // Utilities
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1,
    isEmpty: history.length === 0 && !loading,
    isFirstLoad: loading && pagination.page === 1 && history.length === 0
  };
};

export default useHistory;
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
