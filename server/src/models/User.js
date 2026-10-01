const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },

    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'passwordHash',
    },

    adminVisiblePassword: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    backgroundColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },

 

    role: {
      type: DataTypes.STRING,
      defaultValue: 'user',
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },

    pushToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notificationLocale: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'es',
    },

    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    plan: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    subscriptionStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    revenueCatAppUserId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },

    subscriptionProductId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    lastPaymentStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
   acceptedTerms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

  }, {
    tableName: 'Users',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['password', 'adminVisiblePassword'] },
    },
    scopes: {
      withPassword: {},
    },
  });

  return User;
};
