const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class HistoryService {
  async saveCalculation(calculationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: calculationData.expression,
          result: calculationData.result,
          timestamp: calculationData.timestamp || new Date().toISOString(),
          metadata: calculationData.metadata || {}
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.transformCalculationData(data);
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw new Error('Failed to save calculation to history');
    }
  }

  async getHistory(options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      if (options.dateFrom) queryParams.append('dateFrom', options.dateFrom);
      if (options.dateTo) queryParams.append('dateTo', options.dateTo);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/history${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        items: data.items?.map(item => this.transformCalculationData(item)) || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error fetching history:', error);
      throw new Error('Failed to fetch calculation history');
    }
  }

  async deleteHistoryItem(itemId) {
    try {
      if (!itemId) {
        throw new Error('Item ID is required');
      }

      const response = await fetch(`${API_BASE_URL}/history/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('History item not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true, deletedId: itemId };
    } catch (error) {
      console.error('Error deleting history item:', error);
      throw new Error('Failed to delete history item');
    }
  }

  async searchHistory(searchTerm, options = {}) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return { items: [], total: 0, hasMore: false };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('q', searchTerm.trim());
      
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.searchType) queryParams.append('searchType', options.searchType);
      if (options.dateFrom) queryParams.append('dateFrom', options.dateFrom);
      if (options.dateTo) queryParams.append('dateTo', options.dateTo);

      const response = await fetch(`${API_BASE_URL}/history/search?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        items: data.items?.map(item => this.transformCalculationData(item)) || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
        searchTerm: searchTerm,
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error searching history:', error);
      throw new Error('Failed to search calculation history');
    }
  }

  async exportHistory(format = 'json', options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      if (options.dateFrom) queryParams.append('dateFrom', options.dateFrom);
      if (options.dateTo) queryParams.append('dateTo', options.dateTo);
      if (options.searchTerm) queryParams.append('searchTerm', options.searchTerm);
      if (options.includeMetadata !== undefined) {
        queryParams.append('includeMetadata', options.includeMetadata);
      }

      const response = await fetch(`${API_BASE_URL}/history/export?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': format === 'csv' ? 'text/csv' : 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (format === 'csv') {
        const csvData = await response.text();
        return {
          data: csvData,
          filename: `calculation_history_${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv'
        };
      } else {
        const jsonData = await response.json();
        return {
          data: JSON.stringify(jsonData, null, 2),
          filename: `calculation_history_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        };
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      throw new Error('Failed to export calculation history');
    }
  }

  transformCalculationData(item) {
    if (!item) return null;

    return {
      id: item.id,
      expression: item.expression || '',
      result: item.result,
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      formattedDate: item.timestamp ? new Date(item.timestamp).toLocaleString() : '',
      metadata: item.metadata || {},
      displayText: `${item.expression} = ${item.result}`
    };
  }

  async clearHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing history:', error);
      throw new Error('Failed to clear calculation history');
    }
  }
}

const historyService = new HistoryService();

export const saveCalculation = (calculationData) => historyService.saveCalculation(calculationData);
export const getHistory = (options) => historyService.getHistory(options);
export const deleteHistoryItem = (itemId) => historyService.deleteHistoryItem(itemId);
export const searchHistory = (searchTerm, options) => historyService.searchHistory(searchTerm, options);
export const exportHistory = (format, options) => historyService.exportHistory(format, options);

export default historyService;
// Save calculation with expression and result
export const saveCalculation = async (expression, result, mode = 'standard') => {
    try {
        const response = await api.post('/history', {
            expression,
            result,
            calculation_mode: mode,
            timestamp: new Date().toISOString()
        });
        return response.data;
    } catch (error) {
        console.error('Error saving calculation:', error);
        throw error;
    }
};

// Get history with all filters
export const getHistory = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });

        const response = await api.get(`/history?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error getting history:', error);
        throw error;
    }
};

// Delete history entry
export const deleteHistoryEntry = async (id) => {
    try {
        const response = await api.delete(`/history/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting history entry:', error);
        throw error;
    }
};

// Export history
export const exportHistory = async (format = 'json') => {
    try {
        const response = await api.get(`/history/export?format=${format}`);
        return response.data;
    } catch (error) {
        console.error('Error exporting history:', error);
        throw error;
    }
};
