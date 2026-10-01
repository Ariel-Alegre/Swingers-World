const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
 const PushToken = sequelize.define('PushToken', {
   token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
        userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    locale: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'es',
    },
    platform: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
});

  return PushToken;
};
