const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Database connection - use the proper async function
const { connectDatabase } = require('./config/database');

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Continue running server even if database fails during testing
  }
};

// Import routes
const userRoutes = require('./routes/users');
const calculationRoutes = require('./routes/calculations');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/calculations', calculationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = app;
