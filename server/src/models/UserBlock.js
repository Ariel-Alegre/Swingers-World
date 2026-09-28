const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserBlock = sequelize.define('UserBlock', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    blockerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    blockedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
    },
  }, {
    tableName: 'UserBlocks',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['blockerId', 'blockedUserId'],
      },
    ],
  });

  return UserBlock;
};
