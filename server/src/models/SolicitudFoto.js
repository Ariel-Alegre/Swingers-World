const { DataTypes } = require('sequelize');


// models/SolicitudFoto.js
module.exports = (sequelize) => {
  const SolicitudFoto = sequelize.define('SolicitudFoto', {
    estado: {
      type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada'),
      defaultValue: 'pendiente',
    },
      objetivoId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
      solicitanteId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    respondidaEn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    permisoExpiraEn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  return SolicitudFoto;
};
