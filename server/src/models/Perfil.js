const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Perfil = sequelize.define('Perfil', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'userId',
    },

    nombre_visible: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Usuario VIP',
      field: 'displayName',
    },
  genero: {
       type: DataTypes.STRING,

      allowNull: true,
      field: 'gender',
    },

      busco: {
       type: DataTypes.STRING,

      allowNull: true,
      field: 'lookingFor',
    },
    fecha_nacimiento : {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'birthDate',
    },

    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'address',
    },
latitud: {
  type: DataTypes.FLOAT,
  allowNull: true,
  field: 'latitude',
},
longitud: {
  type: DataTypes.FLOAT,
  allowNull: true,
  field: 'longitude',
},
radio: {
  type: DataTypes.FLOAT,
  allowNull: false,
  defaultValue: 5,
  field: 'radius',
},
    descripcion: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      defaultValue: 'Privada. Solo comparto detalles si me interesa tu perfil.',
      field: 'description',
    },

    fotos: {
      type: DataTypes.ARRAY(DataTypes.JSON),
      allowNull: true,
      field: 'photos',
    },

    visibilidad_foto: {
            type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'photosVisible',

    },
 perfil_publico: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'publicProfile',
    },
    privacidad_activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'privacyEnabled',
    },

     verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'verified',
  }

  }, {
    tableName: 'Perfiles',
    timestamps: true,
  });

  return Perfil;
};
