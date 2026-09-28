// models/Message.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    emisorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'senderId',
    },
    receptorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'receiverId',
    },
    mensaje: {
      type: DataTypes.TEXT,
     allowNull: true,
      field: 'content',

    },
    imagenUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'imageUrl',
    },
    soloUnaVez: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'viewOnce',
    },

       tipo: {
      type: DataTypes.STRING,
            defaultValue: 'texto',
      field: 'type',

    },
    visto: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'viewed',
    },
    leido: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'read',
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'sentAt',
    },
  });

  return Message;
};
