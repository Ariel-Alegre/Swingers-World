const { DataTypes } = require('sequelize');
// models/Notificacion.js
module.exports = (sequelize) => {
 const Notificacion = sequelize.define('Notificacion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  usuarioId: { // receptor de la notificación
    type: DataTypes.UUID,
    allowNull: false,
  },
  tipo: { // 'mensaje', 'solicitudFoto', etc.
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: { // texto corto o JSON con detalles
    type: DataTypes.TEXT,
    allowNull: true,
  },
  leido: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  relacionadaId: { // opcional, id del mensaje o solicitud asociada
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'notificaciones',
});

  return Notificacion;
};
