const { pool } = require('../config/database.js');

class MemoryService {
  constructor() {
    this.initializeTables();
  }

  async initializeTables() {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS memory_slots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          slot_name VARCHAR(100) NOT NULL DEFAULT 'default',
          value DECIMAL(20, 10) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_slot (user_id, slot_name)
        )
      `);
    } catch (error) {
      console.error('Failed to initialize memory_slots table:', error);
    }
  }

  async getUserMemorySlots(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT slot_name, value FROM memory_slots WHERE user_id = ?',
        [userId]
      );

      const slots = {};
      rows.forEach(row => {
        slots[row.slot_name] = parseFloat(row.value);
      });

      return slots;
    } catch (error) {
      console.error('Error fetching memory slots:', error);
      throw error;
    }
  }

  async addToMemory(userId, slotName = 'default', value) {
    try {
      // Get current value
      const [existing] = await pool.execute(
        'SELECT value FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      const currentValue = existing.length > 0 ? parseFloat(existing[0].value) : 0;
      const newValue = currentValue + parseFloat(value);

      // Upsert the memory slot
      await pool.execute(`
        INSERT INTO memory_slots (user_id, slot_name, value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE value = ?, updated_at = CURRENT_TIMESTAMP
      `, [userId, slotName, newValue, newValue]);

      return newValue;
    } catch (error) {
      console.error('Error adding to memory:', error);
      throw error;
    }
  }

  async subtractFromMemory(userId, slotName = 'default', value) {
    try {
      // Get current value
      const [existing] = await pool.execute(
        'SELECT value FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      const currentValue = existing.length > 0 ? parseFloat(existing[0].value) : 0;
      const newValue = currentValue - parseFloat(value);

      // Upsert the memory slot
      await pool.execute(`
        INSERT INTO memory_slots (user_id, slot_name, value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE value = ?, updated_at = CURRENT_TIMESTAMP
      `, [userId, slotName, newValue, newValue]);

      return newValue;
    } catch (error) {
      console.error('Error subtracting from memory:', error);
      throw error;
    }
  }

  async recallMemory(userId, slotName = 'default') {
    try {
      const [rows] = await pool.execute(
        'SELECT value, updated_at FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      if (rows.length === 0) {
        return { value: 0, metadata: { slot_name: slotName, last_accessed: null } };
      }

      return {
        value: parseFloat(rows[0].value),
        metadata: {
          slot_name: slotName,
          last_accessed: rows[0].updated_at
        }
      };
    } catch (error) {
      console.error('Error recalling memory:', error);
      throw error;
    }
  }

  async clearMemory(userId, slotName = 'default') {
    try {
      await pool.execute(`
        INSERT INTO memory_slots (user_id, slot_name, value)
        VALUES (?, ?, 0)
        ON DUPLICATE KEY UPDATE value = 0, updated_at = CURRENT_TIMESTAMP
      `, [userId, slotName]);

      return 0;
    } catch (error) {
      console.error('Error clearing memory:', error);
      throw error;
    }
  }

  async getMemoryMetadata(userId, slotName = 'default') {
    try {
      const [rows] = await pool.execute(
        'SELECT slot_name, value, created_at, updated_at FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        slot_name: rows[0].slot_name,
        value: parseFloat(rows[0].value),
        created_at: rows[0].created_at,
        updated_at: rows[0].updated_at
      };
    } catch (error) {
      console.error('Error getting memory metadata:', error);
      throw error;
    }
  }
}

module.exports = new MemoryService();
