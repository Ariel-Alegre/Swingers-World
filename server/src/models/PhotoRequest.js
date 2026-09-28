const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
  const PhotoRequest = sequelize.define('PhotoRequest', {
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
    },
      targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
      requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    permissionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'PhotoRequests',
  });

  return PhotoRequest;
};
