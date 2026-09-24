import api from "./api.js";
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
          type: calculationData.type || 'basic'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw error;
    }
  }

  async getHistory(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const response = await fetch(`${API_BASE_URL}/history?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }

  async deleteHistoryItem(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting history item:', error);
      throw error;
    }
  }

  async searchHistory(searchOptions = {}) {
    try {
      const {
        query = '',
        type = '',
        dateFrom = '',
        dateTo = '',
        page = 1,
        limit = 20
      } = searchOptions;

      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      if (type) params.append('type', type);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`${API_BASE_URL}/history/search?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching history:', error);
      throw error;
    }
  }

  async exportHistory(exportOptions = {}) {
    try {
      const {
        format = 'json',
        dateFrom = '',
        dateTo = '',
        type = ''
      } = exportOptions;

      const params = new URLSearchParams({
        format
      });

      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (type) params.append('type', type);

      const response = await fetch(`${API_BASE_URL}/history/export?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (format === 'csv') {
        const blob = await response.blob();
        return blob;
      }

      return await response.json();
    } catch (error) {
      console.error('Error exporting history:', error);
      throw error;
    }
  }

  async clearHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  async getHistoryStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/history/stats`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching history stats:', error);
      throw error;
    }
  }
}

const historyService = new HistoryService();

export const saveCalculation = (calculationData) => historyService.saveCalculation(calculationData);
export const getHistory = (options) => historyService.getHistory(options);
export const deleteHistoryItem = (id) => historyService.deleteHistoryItem(id);
export const searchHistory = (searchOptions) => historyService.searchHistory(searchOptions);
export const exportHistory = (exportOptions) => historyService.exportHistory(exportOptions);

export default historyService;
// Replay calculation functionality
export const replayCalculation = async (historyItem) => {
  try {
    const { expression, calculationMode } = historyItem;

    // Re-execute the calculation with the same parameters
    const response = await api.post('/api/calculate', {
      expression,
      mode: calculationMode
    });

    if (response.data.success) {
      // Save the replayed calculation as a new history entry
      await saveCalculation({
        expression,
        result: response.data.result,
        calculationMode,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        result: response.data.result,
        expression
      };
    }

    throw new Error(response.data.error || 'Calculation failed');
  } catch (error) {
    console.error('Replay calculation failed:', error);
    throw error;
  }
};
