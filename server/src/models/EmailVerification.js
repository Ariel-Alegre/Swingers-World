const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('EmailVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  codeHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  locale: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'es',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  lastSentAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  consumedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'EmailVerifications',
  timestamps: true,
  indexes: [{ fields: ['expiresAt'] }],
});
