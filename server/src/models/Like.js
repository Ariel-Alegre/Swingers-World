const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'userId',
    },
    likedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  });



  return Like;
};
