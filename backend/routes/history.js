const express = require('express');
const router = express.Router();
const History = require('../models/History');
const auth = require('../middleware/auth');

// Get user's search history
router.get('/', auth, async (req, res) => {
  try {
    const history = await History.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Add new history entry
router.post('/', auth, async (req, res) => {
  try {
    const { query, results, filters } = req.body;
    
    const historyEntry = new History({
      userId: req.user.id,
      query,
      results,
      filters,
      createdAt: new Date()
    });

    await historyEntry.save();
    res.status(201).json(historyEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save history entry' });
  }
});

// Get specific history entry
router.get('/:id', auth, async (req, res) => {
  try {
    const historyEntry = await History.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json(historyEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history entry' });
  }
});

// Delete specific history entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const historyEntry = await History.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json({ message: 'History entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
});

// Clear all history for user
router.delete('/', auth, async (req, res) => {
  try {
    await History.deleteMany({ userId: req.user.id });
    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;