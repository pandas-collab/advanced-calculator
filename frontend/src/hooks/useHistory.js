import { HISTORY_CONFIG } from "../utils/constants";
import { useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEY = 'calculator_history';
const MAX_HISTORY_ITEMS = 100;

export const useHistory = () => {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setSearchQuery('');
    setFilterType('all');
  }, []);

  // Remove specific history item
  const removeHistoryItem = useCallback((id) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  }, []);

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

  // Export history as JSON
  const exportHistory = useCallback(() => {
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
  }, [history]);

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

  // Get recent calculations (last 10)
  const recentCalculations = useMemo(() => {
    return history.slice(0, 10);
  }, [history]);

  return {
    history: filteredHistory,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    historyStats,
    recentCalculations,
    exportHistory,
    importHistory,
    hasHistory: history.length > 0
  };
};