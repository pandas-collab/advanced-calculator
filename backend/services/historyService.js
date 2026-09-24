const pool = require('../config/database');

class HistoryService {
  async saveCalculation(userId, calculation) {
    const { expression, result, calculationType } = calculation;
    const query = `
      INSERT INTO calculation_history (user_id, expression, result, calculation_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, expression, result, calculation_type, created_at
    `;
    
    try {
      const values = [userId, expression, result, calculationType || 'basic'];
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to save calculation: ${error.message}`);
    }
  }

  async getUserHistory(userId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      calculationType = null,
      startDate = null,
      endDate = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    if (calculationType) {
      paramCount++;
      whereConditions.push(`calculation_type = $${paramCount}`);
      queryParams.push(calculationType);
    }

    if (startDate) {
      paramCount++;
      whereConditions.push(`created_at >= $${paramCount}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`created_at <= $${paramCount}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');
    const validSortFields = ['created_at', 'expression', 'result', 'calculation_type'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM calculation_history
      WHERE ${whereClause}
    `;

    const dataQuery = `
      SELECT id, expression, result, calculation_type, created_at
      FROM calculation_history
      WHERE ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    try {
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      queryParams.push(limit, offset);
      const dataResult = await pool.query(dataQuery, queryParams);

      return {
        data: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to retrieve user history: ${error.message}`);
    }
  }

  async deleteCalculation(userId, calculationId) {
    const query = `
      DELETE FROM calculation_history
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    try {
      const { rows } = await pool.query(query, [calculationId, userId]);
      
      if (rows.length === 0) {
        throw new Error('Calculation not found or unauthorized');
      }

      return { success: true, deletedId: rows[0].id };
    } catch (error) {
      throw new Error(`Failed to delete calculation: ${error.message}`);
    }
  }

  async clearUserHistory(userId, calculationType = null) {
    let query = 'DELETE FROM calculation_history WHERE user_id = $1';
    let params = [userId];

    if (calculationType) {
      query += ' AND calculation_type = $2';
      params.push(calculationType);
    }

    query += ' RETURNING COUNT(*) as deleted_count';

    try {
      const { rows } = await pool.query(query, params);
      return { 
        success: true, 
        deletedCount: parseInt(rows[0].deleted_count || 0),
        message: `Cleared ${rows[0].deleted_count || 0} calculations from history`
      };
    } catch (error) {
      throw new Error(`Failed to clear user history: ${error.message}`);
    }
  }

  async getCalculationById(userId, calculationId) {
    const query = `
      SELECT id, expression, result, calculation_type, created_at
      FROM calculation_history
      WHERE id = $1 AND user_id = $2
    `;

    try {
      const { rows } = await pool.query(query, [calculationId, userId]);
      
      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      throw new Error(`Failed to retrieve calculation: ${error.message}`);
    }
  }

  async getHistoryStats(userId) {
    const query = `
      SELECT 
        calculation_type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM calculation_history
      WHERE user_id = $1
      GROUP BY calculation_type, DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    try {
      const { rows } = await pool.query(query, [userId]);
      return rows;
    } catch (error) {
      throw new Error(`Failed to retrieve history statistics: ${error.message}`);
    }
  }
}

const historyService = new HistoryService();

module.exports = {
  saveCalculation: (userId, calculation) => historyService.saveCalculation(userId, calculation),
  getUserHistory: (userId, options) => historyService.getUserHistory(userId, options),
  deleteCalculation: (userId, calculationId) => historyService.deleteCalculation(userId, calculationId),
  clearUserHistory: (userId, calculationType) => historyService.clearUserHistory(userId, calculationType)
};