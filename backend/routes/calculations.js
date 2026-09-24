const express = require('express');
const router = express.Router();

// GET /api/calculations - Get calculations
router.get('/', (req, res) => {
  res.json({ message: 'Calculations endpoint working', calculations: [] });
});

// POST /api/calculations - Create calculation
router.post('/', (req, res) => {
  res.json({ message: 'Calculation creation endpoint working', calculation: null });
});

module.exports = router;
