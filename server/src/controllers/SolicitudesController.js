const { SolicitudFoto, Notificacion, Usuario, Perfil } = require('../db');
const { Expo } = require('expo-server-sdk');
const { Op } = require('sequelize');
const { getIO } = require('./socket');
const { sendExpoPushNotifications } = require('../utils/pushNotifications');
const SolicitarFoto = async (req, res) => {
  const solicitanteId = req.usuarioId || req.body.solicitanteId;
  const { objetivoId } = req.body;

  try {
    if (!objetivoId || solicitanteId === objetivoId) {
      return res.status(400).json({ message: 'Solicitud de acceso invalida' });
    }

    const objetivo = await Usuario.findByPk(objetivoId, {
      include: [{ model: Perfil }]
    });

    if (!objetivo || objetivo.Perfil?.visibilidad_foto !== false) {
      return res.status(400).json({ message: 'Este usuario ya tiene sus fotos visibles o no existe' });
    }

    const solicitudExistente = await SolicitudFoto.findOne({
      where: { solicitanteId, objetivoId }
    });

    if (solicitudExistente) {
      if (solicitudExistente.estado === 'pendiente') {
        return res.status(409).json({ message: 'Ya enviaste una solicitud a este usuario' });
      }
      if (
        solicitudExistente.estado === 'aceptada' &&
        (!solicitudExistente.permisoExpiraEn || solicitudExistente.permisoExpiraEn > new Date())
      ) {
        return res.status(409).json({ message: 'Ya tienes un permiso activo para estas fotos' });
      }
      solicitudExistente.estado = 'pendiente';
      solicitudExistente.respondidaEn = null;
      solicitudExistente.permisoExpiraEn = null;
      await solicitudExistente.save();
    } else {
      await SolicitudFoto.create({ solicitanteId, objetivoId });
    }

    await Notificacion.create({
      usuarioId: objetivoId,
      tipo: 'solicitud_foto',
      titulo: 'Solicitud de foto privada',
      cuerpo: 'Alguien quiere ver tus fotos privadas',
    });

    try {
      getIO().to(objetivoId.toString()).emit('nuevaSolicitudFoto', {
        solicitanteId,
        objetivoId,
      });
    } catch (socketError) {
      console.warn('No se pudo emitir la solicitud en tiempo real:', socketError.message);
    }

    // 🔔 Enviar push notification si el usuario tiene token
if (objetivo.pushtoken && Expo.isExpoPushToken(objetivo.pushtoken)) {
  const messages = [{
    to: objetivo.pushtoken,
    sound: 'default',
    title: 'Solicitud de foto privada',
    body: 'Alguien quiere ver tus fotos privadas',
    data: {
      screen: 'SolicitudFotos',  // pantalla destino
        params: { tipo: 'solicitud_foto' }
    },
  }];

  await sendExpoPushNotifications(messages);
  console.log('✅ Notificación enviada al objetivo');
}

    res.status(201).json({ message: 'Solicitud enviada o reactivada' });
  } catch (error) {
    console.error('❌ Error al solicitar foto:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const VerSolicitudes = async (req, res) => {
  const usuarioId = req.usuarioId || req.params.usuarioId;

  if (!usuarioId) {
    return res.status(400).json({ message: 'Falta el usuario propietario' });
  }
  if (req.usuarioId && req.params.usuarioId && usuarioId !== req.params.usuarioId) {
    return res.status(403).json({ message: 'No puedes consultar permisos de otro usuario' });
  }

  try {
    const solicitudes = await SolicitudFoto.findAll({
      where: { objetivoId: usuarioId,}, // o eliminar estado para traer todos
      include: [
        {
          model: Usuario,
          as: 'solicitante',
          attributes: ['id', 'nombre', 'apellido', 'color_del_fondo'],
          include: [
            {
              model: Perfil,
              attributes: ['nombre_visible', 'fotos', 'fecha_nacimiento', 'genero', 'verificado', 'descripcion', 'direccion'],
            },
          ],
        },
      ],
    });

    res.json(solicitudes);
  } catch (error) {
    console.error('❌ Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};


// controllers/SolicitudesController.js
const ResponderSolicitud = async (req, res) => {
  const { solicitudId } = req.params;
  const { respuesta, duracionHoras } = req.body; // 'aceptada', 'rechazada' o 'pendiente'

  try {
    const solicitud = await SolicitudFoto.findByPk(solicitudId);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (req.usuarioId && solicitud.objetivoId !== req.usuarioId) {
      return res.status(403).json({ message: 'Solo el propietario puede administrar este permiso' });
    }

    const objetivo = await Usuario.findByPk(solicitud.objetivoId); // el que responde
    const solicitante = await Usuario.findByPk(solicitud.solicitanteId); // el que recibe la respuesta

    if (!['aceptada', 'rechazada', 'pendiente'].includes(respuesta)) {
      return res.status(400).json({ message: 'Respuesta inválida' });
    }
 let tituloNoti = "";
    let cuerpoNoti = "";
    let screenDestino = "Perfil"; // 👈 que abra el perfil
function capitalizar(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

    if (respuesta === "rechazada") {
      await solicitud.destroy();
      tituloNoti = `${capitalizar(objetivo.nombre)} ${capitalizar(objetivo.apellido)}`;
      cuerpoNoti = "Tu solicitud para ver fotos fue rechazada.";

      await Notificacion.create({
        usuarioId: solicitud.solicitanteId,
        tipo: "respuesta_foto",
        titulo: tituloNoti,
        cuerpo: cuerpoNoti,
      });

      if (solicitante?.pushtoken && Expo.isExpoPushToken(solicitante.pushtoken)) {
        await sendExpoPushNotifications([
          {
            to: solicitante.pushtoken,
            sound: "default",
            title: tituloNoti,
            body: cuerpoNoti,
            data: { 
              screen: screenDestino, 
              params: { tipo: "respuesta_solicitud_foto", objetivoId: objetivo.id } 
            },
          },
        ]);
        console.log("✅ Notificación enviada al solicitante (rechazada)");
      }

      return res.json({ message: "Solicitud rechazada y eliminada" });
    }

    // Si es aceptada o pendiente
    solicitud.estado = respuesta;
    solicitud.respondidaEn = new Date();
    if (respuesta === 'aceptada' && duracionHoras !== undefined) {
      const horas = Number(duracionHoras);
      if (![24, 168].includes(horas)) {
        return res.status(400).json({ message: 'La duracion debe ser de 24 horas o 7 dias' });
      }
      solicitud.permisoExpiraEn = new Date(Date.now() + horas * 60 * 60 * 1000);
    } else {
      solicitud.permisoExpiraEn = null;
    }
    await solicitud.save();

    if (respuesta === "aceptada") {
      tituloNoti = `${capitalizar(objetivo.nombre)} ${capitalizar(objetivo.apellido)}`;

      cuerpoNoti = "Te habilitaron a ver las fotos privadas.";
    } else {
        tituloNoti = `${capitalizar(objetivo.nombre)} ${capitalizar(objetivo.apellido)}`;

      cuerpoNoti = "La solicitud fue marcada como pendiente.";
    }

    await Notificacion.create({
      usuarioId: solicitud.solicitanteId,
      tipo: "respuesta_foto",
      titulo: tituloNoti,
      cuerpo: cuerpoNoti,
    });

    if (solicitante?.pushtoken && Expo.isExpoPushToken(solicitante.pushtoken)) {
      await sendExpoPushNotifications([
        {
          to: solicitante.pushtoken,
          sound: "default",
          title: tituloNoti,
          body: cuerpoNoti,
          data: { 
            screen: screenDestino, 
            params: { tipo: "respuesta_solicitud_foto", objetivoId: objetivo.id } 
          },
        },
      ]);
      console.log(`✅ Notificación enviada al solicitante (${respuesta})`);
    }

    res.json({ message: `Solicitud ${respuesta}` });
  } catch (error) {
    console.error("❌ Error al responder solicitud:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


const VerificarPermisoFoto = async (req, res) => {
  const solicitanteId = req.usuarioId || req.query.solicitanteId;
  const { objetivoId } = req.query;

  if (!solicitanteId || !objetivoId) {
    return res.status(400).json({ message: 'Faltan parámetros solicitanteId u objetivoId' });
  }

  try {
    const solicitud = await SolicitudFoto.findOne({
      where: {
        solicitanteId,
        objetivoId,
        estado: 'aceptada',
        [Op.or]: [
          { permisoExpiraEn: null },
          { permisoExpiraEn: { [Op.gt]: new Date() } },
        ],
      },
    });

    res.json({ permitido: !!solicitud, permisoExpiraEn: solicitud?.permisoExpiraEn || null });
  } catch (error) {
    console.error('❌ Error al verificar permiso de foto:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};


const SolicitudesAceptadas = async (req, res) => {
  const usuarioId = req.usuarioId || req.params.usuarioId;

  if (req.usuarioId && req.params.usuarioId && usuarioId !== req.params.usuarioId) {
    return res.status(403).json({ message: 'No puedes consultar permisos de otro usuario' });
  }

  try {
    const solicitudes = await SolicitudFoto.findAll({
      where: {
        solicitanteId: usuarioId,
        estado: 'aceptada',
        [Op.or]: [
          { permisoExpiraEn: null },
          { permisoExpiraEn: { [Op.gt]: new Date() } },
        ],
      },
    });

    res.json(solicitudes);
  } catch (error) {
    console.error('❌ Error al obtener solicitudes aceptadas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
module.exports = { SolicitarFoto, VerSolicitudes, ResponderSolicitud, VerificarPermisoFoto, SolicitudesAceptadas};
