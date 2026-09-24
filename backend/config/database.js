const { Sequelize } = require('sequelize');
const path = require('path');

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database/development.db'),
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  production: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database/production.db'),
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
};

const sequelize = new Sequelize(config[env]);

const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established successfully in ${env} mode`);
    
    if (env === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized');
    } else if (env === 'production') {
      await sequelize.sync();
    }
    
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDatabase
};