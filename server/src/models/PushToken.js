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
});

  return PushToken;
};
