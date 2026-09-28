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


fs.readdirSync(path.join(__dirname, '/models'))
  .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
  .forEach((file) => {
    modelDefiners.push(require(path.join(__dirname, '/models', file)));
  });


modelDefiners.forEach(model => model(sequelize));


let entries = Object.entries(sequelize.models);
let capsEntries = entries.map((entry) => [entry[0][0].toUpperCase() + entry[0].slice(1), entry[1]]);
sequelize.models = Object.fromEntries(capsEntries);


const {
  User,
  Profile,
  Like,
  PhotoRequest,
  Notification,
  Message,
  PushToken,
  UserBlock,
  ContentReport,
} = sequelize.models;


User.hasOne(Profile, { foreignKey: 'userId' });
Profile.belongsTo(User, { foreignKey: 'userId' });


User.hasMany(Like, { foreignKey: 'userId', as: 'likes' });
User.hasMany(Like, { foreignKey: 'likedUserId', as: 'likedBy' });
Like.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Like.belongsTo(User, { as: 'likedUser', foreignKey: 'likedUserId' });


Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });


PhotoRequest.belongsTo(User, { as: 'requester', foreignKey: 'requesterId' });
PhotoRequest.belongsTo(User, { as: 'targetUser', foreignKey: 'targetUserId' });

User.hasMany(PhotoRequest, { as: 'receivedPhotoRequests', foreignKey: 'targetUserId' });
User.hasMany(PhotoRequest, { as: 'sentPhotoRequests', foreignKey: 'requesterId' });


User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });


User.hasMany(PushToken, { foreignKey: 'userId', as: 'pushTokens' });
PushToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });


User.hasMany(UserBlock, { foreignKey: 'blockerId', as: 'blockedUsers' });
User.hasMany(UserBlock, { foreignKey: 'blockedUserId', as: 'blockedByUsers' });
UserBlock.belongsTo(User, { foreignKey: 'blockerId', as: 'blocker' });
UserBlock.belongsTo(User, { foreignKey: 'blockedUserId', as: 'blockedUser' });


User.hasMany(ContentReport, { foreignKey: 'reporterId', as: 'reportsCreated' });
User.hasMany(ContentReport, { foreignKey: 'reportedUserId', as: 'reportsReceived' });
ContentReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
ContentReport.belongsTo(User, { foreignKey: 'reportedUserId', as: 'reportedUser' });
module.exports = {
  ...sequelize.models,
  conn: sequelize,
};
