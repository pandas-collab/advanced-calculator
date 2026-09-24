const express = require('express');
const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint working', token: null });
});

// POST /api/auth/register - User registration
router.post('/register', (req, res) => {
  res.json({ message: 'Registration endpoint working', user: null });
});

module.exports = router;
