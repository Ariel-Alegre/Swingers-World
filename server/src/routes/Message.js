const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadImage');
const { crearMensaje, obtenerMensajes, obtenerConversaciones, marcarComoLeido, obtenerNotificaciones, eliminarMensaje, marcarImagenComoVista} = require('../controllers/Message');
router.post('/mensaje', upload.single('imagen'), crearMensaje);
router.get('/mensajes', obtenerMensajes);
router.get('/conversaciones', obtenerConversaciones);

router.post('/marcar-como-leido', marcarComoLeido);
router.get('/notificaciones', obtenerNotificaciones);

router.post('/mensaje/eliminar', eliminarMensaje);

router.post('/mensaje/marcar-vista', marcarImagenComoVista);

module.exports = router;
