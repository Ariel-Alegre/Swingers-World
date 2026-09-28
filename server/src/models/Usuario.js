const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'firstName',
    },

    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'lastName',
    },

    correo_electronico: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      field: 'email',
    },

    contraseña: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'passwordHash',
    },

    contraseña_visible_admin: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'adminVisiblePassword',
    },

    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phone',
    },

    pais: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'country',
    },

    color_del_fondo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'backgroundColor',
    },

 

    role: {
      type: DataTypes.STRING,
      defaultValue: 'usuario',
    },

    estado: { // 'activo', 'pendiente', etc.
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
      field: 'status',
    },

    pushtoken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'pushToken',
    },

    stripeCustomerId: { // ID del cliente en Stripe
      type: DataTypes.STRING,
      allowNull: true,
    },

    stripeSubscriptionId: { // ID de la suscripción
      type: DataTypes.STRING,
      allowNull: true,
    },

    plan: { // Plan comprado
      type: DataTypes.STRING,
      allowNull: true,
    },

    subscriptionStatus: { // Estado de la suscripción: active, past_due, canceled
      type: DataTypes.STRING,
      allowNull: true,
    },

    currentPeriodEnd: { // Fecha de fin del período actual
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastPaymentStatus: { // Estado del último pago
      type: DataTypes.STRING,
      allowNull: true,
    },
   acepta_terminos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'acceptedTerms',
    },

  }, {
    tableName: 'Usuarios',
    timestamps: true, // createdAt y updatedAt
  });

  return Usuario;
};
