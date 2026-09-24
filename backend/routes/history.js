const express = require('express');
const router = express.Router();

// GET /api/history - Get calculation history
router.get('/', (req, res) => {
  res.json({ message: 'History endpoint working', history: [] });
});

module.exports = router;
