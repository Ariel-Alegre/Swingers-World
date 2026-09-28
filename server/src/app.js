const express = require('express');
const cors = require('cors'); // 1. Importa cors
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const routes = require('./routes/index.js');
const { webhookStripe, webhookRevenueCat } = require('./controllers/Usuario');
const { materializeMediaReferences, getRequestBaseUrl } = require('./utils/objectStorage');
require('./db.js');

const server = express();
server.name = 'API';
server.set('trust proxy', 1);

// 2. Configuración de CORS
const corsOptions = {
  origin: true, // Esto refleja el origin de la petición, permitiendo credenciales
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

server.use(cors(corsOptions)); // Aplica el middleware de CORS

// Webhook debe ir ANTES de los parsers de body si requiere raw
server.post('/api/webhook', express.raw({ type: 'application/json' }), webhookStripe);
server.post('/api/revenuecat/webhook', express.json({ limit: '5mb' }), webhookRevenueCat);

server.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
server.use(bodyParser.json({ limit: '50mb' }));
server.use(cookieParser());
server.use(morgan('dev'));

// Convierte referencias privadas del bucket en URLs firmadas de corta duración.
server.use((req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => sendJson(materializeMediaReferences(payload, getRequestBaseUrl(req)));
  next();
});

// Elimina tu middleware manual de res.header(...)

server.use('/', routes);

// Error catching endware
server.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || err;
  console.error(err);
  res.status(status).send(message);
});

module.exports = server;
