import db from "../config/database.js";

class MemoryService {
  constructor() {
    this.initializeTables();
  }

  async initializeTables() {
    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS memory_slots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          slot_name TEXT NOT NULL DEFAULT 'default',
          value TEXT DEFAULT '0',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name),
          UNIQUE(user_id, slot_name)
        )
      `);
    } catch (error) {
      console.error('Failed to initialize memory_slots table:', error);
    }
  }

  // Create memory slot in database
  async createMemorySlot(userId, name, value, metadata = {}) {
    const query = `
      INSERT INTO memory_slots (user_id, name, value, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, name) DO UPDATE SET
        value = excluded.value,
        metadata = excluded.metadata,
        updated_at = datetime('now')
    `;

    return await db.run(query, [userId, name, value, JSON.stringify(metadata)]);
  }

  // Get memory slot from database
  async getMemorySlot(userId, name) {
    const query = `SELECT * FROM memory_slots WHERE user_id = ? AND name = ?`;
    const row = await db.get(query, [userId, name]);

    if (row) {
      return {
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      };
    }

    return null;
  }

  // Get all memory slots for user
  async getUserMemorySlots(userId) {
    const query = `SELECT * FROM memory_slots WHERE user_id = ? ORDER BY name`;
    const rows = await db.all(query, [userId]);

    const slots = {};
    rows.forEach(row => {
      slots[row.slot_name || row.name] = parseFloat(row.value);
    });

    return slots;
  }

  // Update memory slot value
  async updateMemorySlot(userId, name, value, metadata = {}) {
    const query = `
      UPDATE memory_slots
      SET value = ?, metadata = ?, updated_at = datetime('now')
      WHERE user_id = ? AND name = ?
    `;

    return await db.run(query, [value, JSON.stringify(metadata), userId, name]);
  }

  // Delete memory slot
  async deleteMemorySlot(userId, name) {
    const query = `DELETE FROM memory_slots WHERE user_id = ? AND name = ?`;
    return await db.run(query, [userId, name]);
  }

  // Clear all memory slots for user
  async clearUserMemory(userId) {
    const query = `DELETE FROM memory_slots WHERE user_id = ?`;
    return await db.run(query, [userId]);
  }

  async addToMemory(userId, slotName = 'default', value) {
    try {
      // Get current value
      const existing = await db.get(
        'SELECT value FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      const currentValue = existing ? parseFloat(existing.value) : 0;
      const newValue = currentValue + parseFloat(value);

      // Upsert the memory slot
      await db.run(`
        INSERT INTO memory_slots (user_id, slot_name, value, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, slot_name) DO UPDATE SET 
          value = excluded.value, 
          updated_at = datetime('now')
      `, [userId, slotName, newValue]);

      return newValue;
    } catch (error) {
      console.error('Error adding to memory:', error);
      throw error;
    }
  }

  async subtractFromMemory(userId, slotName = 'default', value) {
    try {
      // Get current value
      const existing = await db.get(
        'SELECT value FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      const currentValue = existing ? parseFloat(existing.value) : 0;
      const newValue = currentValue - parseFloat(value);

      // Upsert the memory slot
      await db.run(`
        INSERT INTO memory_slots (user_id, slot_name, value, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, slot_name) DO UPDATE SET 
          value = excluded.value, 
          updated_at = datetime('now')
      `, [userId, slotName, newValue]);

      return newValue;
    } catch (error) {
      console.error('Error subtracting from memory:', error);
      throw error;
    }
  }

  async recallMemory(userId, slotName = 'default') {
    try {
      const row = await db.get(
        'SELECT value, updated_at FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      if (!row) {
        return { value: 0, metadata: { slot_name: slotName, last_accessed: null } };
      }

      return {
        value: parseFloat(row.value),
        metadata: {
          slot_name: slotName,
          last_accessed: row.updated_at
        }
      };
    } catch (error) {
      console.error('Error recalling memory:', error);
      throw error;
    }
  }

  async clearMemory(userId, slotName = 'default') {
    try {
      await db.run(`
        INSERT INTO memory_slots (user_id, slot_name, value, updated_at)
        VALUES (?, ?, 0, datetime('now'))
        ON CONFLICT(user_id, slot_name) DO UPDATE SET 
          value = 0, 
          updated_at = datetime('now')
      `, [userId, slotName]);

      return 0;
    } catch (error) {
      console.error('Error clearing memory:', error);
      throw error;
    }
  }

  async getMemoryMetadata(userId, slotName = 'default') {
    try {
      const row = await db.get(
        'SELECT slot_name, value, created_at, updated_at FROM memory_slots WHERE user_id = ? AND slot_name = ?',
        [userId, slotName]
      );

      if (!row) {
        return null;
      }

      return {
        slot_name: row.slot_name,
        value: parseFloat(row.value),
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error getting memory metadata:', error);
      throw error;
    }
  }

  // Memory arithmetic operations
  async memoryAdd(userId, name, value) {
    const existing = await this.getMemorySlot(userId, name);
    const currentValue = existing ? parseFloat(existing.value) || 0 : 0;
    const newValue = currentValue + (parseFloat(value) || 0);

    if (existing) {
      await this.updateMemorySlot(userId, name, newValue.toString());
    } else {
      await this.createMemorySlot(userId, name, newValue.toString());
    }

    return newValue;
  }

  async memorySubtract(userId, name, value) {
    const existing = await this.getMemorySlot(userId, name);
    const currentValue = existing ? parseFloat(existing.value) || 0 : 0;
    const newValue = currentValue - (parseFloat(value) || 0);

    if (existing) {
      await this.updateMemorySlot(userId, name, newValue.toString());
    } else {
      await this.createMemorySlot(userId, name, newValue.toString());
    }

    return newValue;
  }

  async memoryRecall(userId, name) {
    const slot = await this.getMemorySlot(userId, name);
    return slot ? parseFloat(slot.value) || 0 : 0;
  }

  async memoryClear(userId, name) {
    await this.deleteMemorySlot(userId, name);
    return 0;
  }
}

export default new MemoryService();
