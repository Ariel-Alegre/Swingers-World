const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },

    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'VIP Member',
    },
  gender: {
       type: DataTypes.STRING,

      allowNull: true,
    },

      lookingFor: {
       type: DataTypes.STRING,

      allowNull: true,
    },
    birthDate : {
      type: DataTypes.STRING,
      allowNull: true,
    },

    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
latitude: {
  type: DataTypes.FLOAT,
  allowNull: true,
},
longitude: {
  type: DataTypes.FLOAT,
  allowNull: true,
},
radius: {
  type: DataTypes.FLOAT,
  allowNull: false,
  defaultValue: 5,
},
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      defaultValue: 'Private. I only share details when I am interested in a profile.',
    },

    photos: {
      type: DataTypes.ARRAY(DataTypes.JSON),
      allowNull: true,
    },

    photosVisible: {
            type: DataTypes.BOOLEAN,
        defaultValue: false,

    },
 publicProfile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    privacyEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

     verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }

  }, {
    tableName: 'Profiles',
    timestamps: true,
  });

  return Profile;
};
