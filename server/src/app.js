const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const routes = require('./routes/index.js');
const { webhookStripe, webhookRevenueCat } = require('./controllers/User');
const { materializeMediaReferences, getRequestBaseUrl } = require('./utils/objectStorage');
require('./db.js');

const server = express();
server.name = 'API';
server.set('trust proxy', 1);

server.get('/', (req, res) => {
  res.status(200).json({ name: 'Swingers World API', status: 'ok' });
});

server.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

server.use(cors(corsOptions));


server.post('/api/webhook', express.raw({ type: 'application/json' }), webhookStripe);
server.post('/api/revenuecat/webhook', express.json({ limit: '5mb' }), webhookRevenueCat);

server.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
server.use(bodyParser.json({ limit: '50mb' }));
server.use(cookieParser());
server.use(morgan('dev'));


server.use((req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => sendJson(materializeMediaReferences(payload, getRequestBaseUrl(req)));
  next();
});



server.use('/', routes);


server.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || err;
  console.error(err);
  res.status(status).send(message);
});

module.exports = server;
