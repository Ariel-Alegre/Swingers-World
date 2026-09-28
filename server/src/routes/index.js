
const { Router  }= require('express');
const router = Router();

const UsuarioRouter = require("./Usuario")
const MessageRouter = require("./Message");
const SolicitudesRouter = require("./Solicitudes");
const AdminRouter = require("./Admin");
const TestRouter = require("./Test");
const MediaRouter = require('./Media');


router.use('/api', MediaRouter, UsuarioRouter, MessageRouter, SolicitudesRouter, AdminRouter, TestRouter) 



module.exports = router
