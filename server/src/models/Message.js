
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
     allowNull: true,

    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    audioUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    audioDurationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    viewOnce: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

       type: {
      type: DataTypes.STRING,
            defaultValue: 'text',

    },
    viewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    senderDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    receiverDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    senderArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    receiverArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  return Message;
};
