require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const {
  DB_USER, DB_PASSWORD, DB_HOST, DB_DATABASE, DB_PORT
} = process.env;

const sequelize = new Sequelize(DB_DATABASE.trim(), DB_USER.trim(), DB_PASSWORD, {
  logging: false,
  native: false,
  host: DB_HOST.trim(),
  port: Number(DB_PORT) || 5432,
  dialect: 'postgres',
});

const basename = path.basename(__filename);
const modelDefiners = [];

// Leemos todos los archivos de la carpeta Models, los requerimos y agregamos al arreglo modelDefiners
fs.readdirSync(path.join(__dirname, '/models'))
  .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
  .forEach((file) => {
    modelDefiners.push(require(path.join(__dirname, '/models', file)));
  });

// Injectamos la conexión (sequelize) a todos los modelos
modelDefiners.forEach(model => model(sequelize));

// Capitalizamos los nombres de los modelos ie: product => Product
let entries = Object.entries(sequelize.models);
let capsEntries = entries.map((entry) => [entry[0][0].toUpperCase() + entry[0].slice(1), entry[1]]);
sequelize.models = Object.fromEntries(capsEntries);

// En sequelize.models están todos los modelos importados como propiedades
// Para relacionarlos hacemos un destructuring



// Obtener modelos
const {
  Usuario,
  Perfil,
  Like,
  SolicitudFoto,
  Notificacion,
  Message,
  PushToken,
  UserBlock,
  ContentReport,
} = sequelize.models;

// Relación Usuario - Perfil (1:1)
Usuario.hasOne(Perfil, { foreignKey: 'usuarioId' });
Perfil.belongsTo(Usuario, { foreignKey: 'usuarioId' });

// Likes
Usuario.hasMany(Like, { foreignKey: 'usuarioId', as: 'likes' });
Usuario.hasMany(Like, { foreignKey: 'likedUserId', as: 'likedBy' });
Like.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });
Like.belongsTo(Usuario, { as: 'likedUser', foreignKey: 'likedUserId' });

// Mensajes
Message.belongsTo(Usuario, { as: 'emisor', foreignKey: 'emisorId' });
Message.belongsTo(Usuario, { as: 'receptor', foreignKey: 'receptorId' });

// Solicitudes de foto
SolicitudFoto.belongsTo(Usuario, { as: 'solicitante', foreignKey: 'solicitanteId' });
SolicitudFoto.belongsTo(Usuario, { as: 'objetivo', foreignKey: 'objetivoId' });

Usuario.hasMany(SolicitudFoto, { as: 'solicitudesRecibidas', foreignKey: 'objetivoId' });
Usuario.hasMany(SolicitudFoto, { as: 'solicitudesEnviadas', foreignKey: 'solicitanteId' });

// Notificaciones
Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId', as: 'notificaciones' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

// PushTokens 👇
Usuario.hasMany(PushToken, { foreignKey: 'userId', as: 'pushTokens' });
PushToken.belongsTo(Usuario, { foreignKey: 'userId', as: 'usuario' });

// Blocked users
Usuario.hasMany(UserBlock, { foreignKey: 'blockerId', as: 'blockedUsers' });
Usuario.hasMany(UserBlock, { foreignKey: 'blockedUserId', as: 'blockedByUsers' });
UserBlock.belongsTo(Usuario, { foreignKey: 'blockerId', as: 'blocker' });
UserBlock.belongsTo(Usuario, { foreignKey: 'blockedUserId', as: 'blockedUser' });

// Content reports
Usuario.hasMany(ContentReport, { foreignKey: 'reporterId', as: 'reportsCreated' });
Usuario.hasMany(ContentReport, { foreignKey: 'reportedUserId', as: 'reportsReceived' });
ContentReport.belongsTo(Usuario, { foreignKey: 'reporterId', as: 'reporter' });
ContentReport.belongsTo(Usuario, { foreignKey: 'reportedUserId', as: 'reportedUser' });
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize,     // para importar la conexión { conn } = require('./db.js');
};
