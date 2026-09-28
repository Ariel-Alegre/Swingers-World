
const { Router  }= require('express');
const router = Router();
const {Registrarse, RegistrarSuscripcionIOSRevenueCat, IniciarSesion, DataPersonal,crearSesionPago, webhookStripe, ActualizarPerfil, DetallePerfil, EliminarFotoPerfil, EliminarCuenta, Perfiles, PerfilesIOSCommunity, DarLike, MisLikes, EliminarLikes, ReportarUsuario, BloquearUsuario} = require("../controllers/Usuario")
const {TokenPush} = require("../controllers/TokenPush")
const validarToken = require('../middleware/validarToken');

const upload = require('../middleware/uploadImage');
const express = require('express'); // 👈 Importar express aquí
router.patch('/actualizar-perfil', upload.fields([{ name: 'fotos', maxCount: 10 }]), ActualizarPerfil);

router.post('/registrarse', Registrarse ) ;
router.post('/registrarse-ios-revenuecat', RegistrarSuscripcionIOSRevenueCat ) ;
router.post('/iniciar-sesion', IniciarSesion ) ;
router.get('/mi-perfil', DataPersonal ) ;
router.delete('/eliminar-foto', EliminarFotoPerfil ) ;
router.delete('/eliminar-cuenta', EliminarCuenta ) ;
router.get('/perfiles', Perfiles ) ;
router.get('/ios/community-members', PerfilesIOSCommunity ) ;
router.get('/perfil/:id', DetallePerfil ) ;



router.post('/like', DarLike);
router.get('/mis-likes', MisLikes);
router.delete('/mis-likes/:id', EliminarLikes);
router.post('/report-user', ReportarUsuario);
router.post('/block-user', BloquearUsuario);
router.post('/crear-pago', crearSesionPago);
router.post("/tokenPush",TokenPush);
router.post('/push-token', validarToken, TokenPush);








module.exports = router
