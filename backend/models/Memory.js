const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Memory = sequelize.define('Memory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  slotName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'memories',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'slotName']
    },
    {
      fields: ['userId']
    }
  ]
});

Memory.belongsTo(User, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});

User.hasMany(Memory, {
  foreignKey: 'userId',
  as: 'memories'
});

module.exports = Memory;