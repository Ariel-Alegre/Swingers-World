const http = require('http');
const server = require('./src/app');
const { conn } = require('./src/db');
const { initSocket } = require('./src/controllers/socket');

const PORT = process.env.PORT || 3001;
const httpServer = http.createServer(server);

initSocket(httpServer);

async function startServer() {
  await conn.sync({ force: false });
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
