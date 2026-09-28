// routes/solicitudes.js
const express = require('express');
const router = express.Router();
const {
  SolicitarFoto,
  VerSolicitudes,
  ResponderSolicitud,
  VerificarPermisoFoto,
  SolicitudesAceptadas
} = require('../controllers/SolicitudesController');
const validarToken = require('../middleware/validarToken');

// Consent Center (iOS build 11+): authenticated endpoints.
router.post('/consent/solicitar', validarToken, SolicitarFoto);
router.get('/consent/solicitudes', validarToken, VerSolicitudes);
router.put('/consent/responder/:solicitudId', validarToken, ResponderSolicitud);
router.get('/consent/verificada', validarToken, VerificarPermisoFoto);

// Legacy endpoints remain unchanged for the existing Android and web clients.
router.post('/solicitar', SolicitarFoto);
router.get('/ver/:usuarioId', VerSolicitudes);
router.put('/responder/:solicitudId', ResponderSolicitud);


router.get('/solicitudes/verificada', VerificarPermisoFoto);

router.get('/solicitudes-aceptadas/:usuarioId', SolicitudesAceptadas);

// En routes/solicitudes.js

module.exports = router;
