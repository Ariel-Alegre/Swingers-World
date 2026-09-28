require('dotenv').config();
const { Op, Sequelize } = require('sequelize');
const { Message, Usuario, Perfil } = require('../db');
const { getIO } = require('../controllers/socket');
const { Expo } = require('expo-server-sdk');
const { sendExpoPushNotifications } = require('../utils/pushNotifications');
const { areUsersBlocked, getBlockedUserIdsForUser } = require('../utils/blocks');
const { findObjectionableMatch } = require('../utils/safety');
const {
  uploadFile,
  deleteStoredObject,
  normalizeStorageReference,
  materializeMediaReferences,
  getRequestBaseUrl,
} = require('../utils/objectStorage');

const obtenerMensajes = async (req, res) => {
  try {
    const { emisorId, receptorId, before } = req.query;

    if (await areUsersBlocked(emisorId, receptorId)) {
      return res.json([]);
    }

    const whereClause = {
      [Op.or]: [
        { emisorId, receptorId },
        { emisorId: receptorId, receptorId: emisorId },
      ],
    };

    if (before) {
      whereClause.fecha = { [Op.lt]: new Date(before) };
    }

    const mensajes = await Message.findAll({
      where: whereClause,
      order: [['fecha', 'DESC']],
      limit: 50,
    });

    res.json(mensajes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo mensajes' });
  }
};

// Este crearMensaje recibe req.file.buffer si es subida de imagen


const crearMensaje = async (req, res) => {
  const { emisorId, receptorId, mensaje, } = req.body;


  let imagenUrl = null;

  try {
    if (req.file && req.file.buffer) {
      imagenUrl = await uploadFile(req.file, 'chat-images');
    } else if (req.body.imagenUrl) {
      imagenUrl = normalizeStorageReference(req.body.imagenUrl);
    }

    if (!emisorId || !receptorId) {
      return res.status(400).json({ error: 'Faltan emisorId o receptorId' });
    }

    if (await areUsersBlocked(emisorId, receptorId)) {
      return res.status(403).json({ error: 'No puedes enviar mensajes a este usuario.' });
    }

    const objectionableMatch = findObjectionableMatch(mensaje);
    if (objectionableMatch) {
      return res.status(400).json({ error: 'El mensaje contiene contenido no permitido.' });
    }

    const nuevoMensaje = await Message.create({
      emisorId,
      receptorId,
      mensaje: mensaje || null,
      imagenUrl: imagenUrl || null,
      tipo: imagenUrl ? 'imagen' : 'texto',
      soloUnaVez: 'true',
      visto: false,
      leido: false,
      fecha: new Date(),
    });

    // Emitir por socket
    const io = getIO();
    const roomId = [emisorId, receptorId].sort().join('-');
    io.to(roomId).emit(
      'receiveMessage',
      materializeMediaReferences(nuevoMensaje, getRequestBaseUrl(req)),
    );

    const mensajesNoLeidos = await Message.count({
      where: { receptorId, leido: false },
    });
    io.to(receptorId.toString()).emit('mensajesNoLeidos', { cantidad: mensajesNoLeidos });

    // 📩 Buscar token del receptor
    const receptor = await Usuario.findByPk(receptorId);
    const emisor = await Usuario.findByPk(emisorId);
    const capitalizar = (str) => {
      if (!str) return '';
      return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };



    // Ejemplo con tu emisor
    const nombreCompleto = capitalizar(`${emisor.nombre} ${emisor.apellido}`);
    if (receptor && receptor.pushtoken && Expo.isExpoPushToken(receptor.pushtoken)) {

      const messages = [{
        to: receptor.pushtoken,
        sound: 'default',
        title: nombreCompleto,
        body: mensaje?.slice(0, 50) || 'Nuevo mensaje', // opcional: preview del mensaje
        data: {
          screen: 'ChatDetail',
          params: { tipo: 'mensaje', receptorId: emisorId }
        }
        ,
        badge: mensajesNoLeidos
      }];

      await sendExpoPushNotifications(messages);
    }

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error('❌ Error al crear mensaje:', error);
    res.status(500).json({ error: 'Error al crear mensaje' });
  }
};




const obtenerConversaciones = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Falta userId' });

  try {
    const blockedUserIds = await getBlockedUserIdsForUser(userId);

    const mensajes = await Message.findAll({
      where: {
        [Op.and]: [
          { [Op.or]: [{ emisorId: userId }, { receptorId: userId }] },
          {
            emisorId: { [Op.notIn]: blockedUserIds },
          },
          {
            receptorId: { [Op.notIn]: blockedUserIds },
          },
        ],
      },
      attributes: [
        'id',
        'mensaje',
        'fecha',
        'emisorId',
        'receptorId',
        'leido',
        [
          Sequelize.literal(
            `CASE WHEN "emisorId" = '${userId}' THEN "receptorId" ELSE "emisorId" END`
          ),
          'interlocutorId',
        ],
      ],
      order: [['fecha', 'DESC']],
    });

    const conversacionesMap = new Map();

    for (const m of mensajes) {
      const interlocutorId = m.get('interlocutorId');
      if (!conversacionesMap.has(interlocutorId)) {
        conversacionesMap.set(interlocutorId, m);
      }
    }

    const interlocutoresIds = Array.from(conversacionesMap.keys());

    const interlocutores = await Usuario.findAll({
      where: {
        id: interlocutoresIds.filter((id) => !blockedUserIds.includes(id)),
      },
      include: [{ model: Perfil }],
    });

    const resultado = interlocutores.map((user) => {
      const mensaje = conversacionesMap.get(user.id);
      return {
        interlocutorId: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        avatar: user.Perfil?.fotos?.[0]?.url ?? null,
        ultimoMensaje: mensaje.mensaje,
        fechaUltimoMensaje: mensaje.fecha,
        ultimoMensajeDeOtro: mensaje.emisorId !== userId,
        leido: mensaje.emisorId !== userId && mensaje.leido === true,
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

const marcarComoLeido = async (req, res) => {
  try {
    const { emisorId, receptorId, tipo, messageId } = req.body;

    if (tipo === 'texto') {
      // Marcar TODOS los mensajes tipo texto de emisor a receptor como leídos
      await Message.update(
        { leido: true },
        {
          where: {
            emisorId,
            receptorId,
            leido: false,
            tipo: 'texto',
          },
        }
      );
    } else if (tipo === 'imagen' && messageId) {
      // Marcar solo el mensaje específico tipo imagen como leído
      const mensaje = await Message.findByPk(messageId);
      if (!mensaje) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }
      if (!mensaje.leido) {
        mensaje.leido = true;
        await mensaje.save();
      }
    } else {
      return res.status(400).json({ error: 'Parámetros incorrectos o faltantes' });
    }



    const cantidad = await Message.count({
      where: { receptorId, leido: false },
    });
    getIO().to(receptorId.toString()).emit('mensajesNoLeidos', { cantidad });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marcando como leídos:', error);
    res.status(500).json({ error: 'Error marcando como leídos' });
  }
};

const obtenerNotificaciones = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Falta userId' });

  try {
    const mensajesNoLeidos = await Message.findAll({
      where: {
        receptorId: userId,
        leido: false,
      },
      attributes: [
        'emisorId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'cantidad']
      ],
      group: ['emisorId'],
      raw: true, // Opcional: para obtener objetos planos
    });

    res.json(mensajesNoLeidos);
  } catch (error) {
    console.error('❌ Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};


// Cuando el receptor vea la imagen, la marcamos vista y la eliminamos si es de tipo soloUnaVez
const marcarImagenComoVista = async (req, res) => {
  const { messageId } = req.body;

  try {
    const mensaje = await Message.findByPk(messageId);

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (mensaje.soloUnaVez) {
      // Marcamos como visto
      mensaje.visto = true;
      await mensaje.save();

      // Eliminamos la imagen del bucket si tiene imagenUrl
      if (mensaje.imagenUrl) {
        try {
          await deleteStoredObject(mensaje.imagenUrl);
        } catch (err) {
          console.warn('No se pudo eliminar la imagen del bucket:', err);
        }
      }

      // Eliminamos el mensaje de la DB
      await mensaje.destroy();

      // Emitir evento para actualizar en cliente
      const io = getIO();
      const roomId = [mensaje.emisorId, mensaje.receptorId].sort().join('-');
      io.to(roomId).emit('messageDeleted', { messageId });

      return res.json({ success: true, message: 'Mensaje eliminado tras ver imagen' });
    }

    res.status(400).json({ error: 'El mensaje no es de tipo soloUnaVez' });
  } catch (error) {
    console.error('❌ Error al marcar imagen como vista y eliminar:', error);
    res.status(500).json({ error: 'Error al procesar imagen' });
  }
};

const eliminarMensaje = async (req, res) => {
  const { mensajeId } = req.body;

  try {
    const mensaje = await Message.findByPk(mensajeId);
    if (!mensaje) return res.status(404).json({ error: 'Mensaje no encontrado' });

    if (mensaje.soloUnaVez) {
      // Si querés eliminar imagen también aquí
      if (mensaje.imagenUrl) {
        try {
          await deleteStoredObject(mensaje.imagenUrl);
        } catch (err) {
          console.warn('No se pudo eliminar la imagen del bucket:', err);
        }
      }

      await mensaje.destroy();
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'El mensaje no es de tipo soloUnaVez' });
    }
  } catch (error) {
    console.error('❌ Error al eliminar mensaje:', error);
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
};

module.exports = {
  crearMensaje,
  obtenerMensajes,
  obtenerConversaciones,
  marcarComoLeido,
  obtenerNotificaciones,
  marcarImagenComoVista,
  eliminarMensaje,
};
