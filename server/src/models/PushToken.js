const { DataTypes } = require('sequelize');
// models/Notificacion.js
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
