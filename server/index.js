const http = require('http');
const server = require('./src/app.js');
const { conn } = require('./src/db.js');
const { initSocket } = require('./src/controllers/socket.js');

const PORT = process.env.PORT || 3001;

const httpServer = http.createServer(server);

const io = initSocket(httpServer);

async function ensureAdminPasswordColumn() {
  const queryInterface = conn.getQueryInterface();
  const table = await queryInterface.describeTable('Usuarios');

  if (!table.contraseña_visible_admin) {
    await queryInterface.addColumn('Usuarios', 'contraseña_visible_admin', {
      type: conn.Sequelize.STRING,
      allowNull: true,
    });
  }
}

async function ensurePhotoConsentColumns() {
  const queryInterface = conn.getQueryInterface();
  const table = await queryInterface.describeTable('SolicitudFotos');

  if (!table.respondidaEn) {
    await queryInterface.addColumn('SolicitudFotos', 'respondidaEn', {
      type: conn.Sequelize.DATE,
      allowNull: true,
    });
  }

  if (!table.permisoExpiraEn) {
    await queryInterface.addColumn('SolicitudFotos', 'permisoExpiraEn', {
      type: conn.Sequelize.DATE,
      allowNull: true,
    });
  }
}

conn.sync({ force: false }).then(async () => {
  await ensureAdminPasswordColumn();
  await ensurePhotoConsentColumns();

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  });
});
