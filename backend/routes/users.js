const express = require('express');
const router = express.Router();

// GET /api/users - Get all users (placeholder)
router.get('/', (req, res) => {
  res.json({ message: 'Users endpoint working', users: [] });
});

// POST /api/users - Create user (placeholder)
router.post('/', (req, res) => {
  res.json({ message: 'User creation endpoint working', user: null });
});

module.exports = router;
