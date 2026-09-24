import db from "../config/database.js";

class MemoryService {
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

    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
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
