// socket.js
const { Message, Usuario, SolicitudFoto } = require('../db');
const { Expo } = require('expo-server-sdk');
const { sendExpoPushNotifications } = require('../utils/pushNotifications');
const { areUsersBlocked } = require('../utils/blocks');
const { findObjectionableMatch } = require('../utils/safety');
const { normalizeStorageReference, materializeMediaReferences, getConfiguredBaseUrl } = require('../utils/objectStorage');

let io;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  // Función auxiliar para enviar mensajes no leídos a un usuario
  async function enviarMensajesNoLeidos(userId) {
    try {
      const mensajesNoLeidos = await Message.findAll({
        where: { receptorId: userId, leido: false },
      });

      io.to(userId).emit('mensajesNoLeidos', materializeMediaReferences({
        cantidad: mensajesNoLeidos.length,
        mensajes: mensajesNoLeidos,
      }, getConfiguredBaseUrl()));
    } catch (error) {
      console.error('Error buscando mensajes no leídos:', error);
    }
  }

  io.on('connection', (socket) => {
    console.log('✅ Usuario conectado:', socket.id);

    // Cliente indica su userId para unirse a sala y recibir mensajes no leídos
    socket.on('setUserId', async (userId) => {
      socket.join(userId);
      console.log(`Usuario ${socket.id} unido a sala userId: ${userId}`);

      // Envío mensajes no leídos apenas se une
      await enviarMensajesNoLeidos(userId);
    });

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`📥 Usuario ${socket.id} se unió a la sala ${roomId}`);
    });

    socket.on('sendMessage', async ({
      roomId,
      mensaje,
      emisorId,
      receptorId,
      tipo,
      fecha,
      imagenUrl = null,
      soloUnaVez = false
    }) => {
      try {
        if (await areUsersBlocked(emisorId, receptorId)) {
          socket.emit('errorMessage', { error: 'No puedes enviar mensajes a este usuario.' });
          return;
        }

        const objectionableMatch = findObjectionableMatch(mensaje);
        if (objectionableMatch) {
          socket.emit('errorMessage', { error: 'El mensaje contiene contenido no permitido.' });
          return;
        }

        // Crear mensaje en DB
        const nuevoMensaje = await Message.create({
          mensaje,
          emisorId,
          receptorId,
          tipo,
          leido: false,
          imagenUrl: normalizeStorageReference(imagenUrl),
          soloUnaVez,
          fecha: fecha || new Date(),
        });

        const receptor = await Usuario.findByPk(receptorId);
        const emisor = await Usuario.findByPk(emisorId);

        const capitalizar = (str) => {
          if (!str) return '';
          return str
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        };
        const nombreCompleto = capitalizar(`${emisor.nombre} ${emisor.apellido}`);

        // ✅ Verificar si el receptor NO está en la sala del chat
        const socketsEnSala = await io.in(roomId).fetchSockets();
        const receptorEnSala = socketsEnSala.some(s => s.handshake.query.userId === receptorId);

        if (receptor?.pushtoken && Expo.isExpoPushToken(receptor.pushtoken) && !receptorEnSala) {
          const mensajesNoLeidos = await Message.count({
            where: { receptorId, leido: false }
          });

          const messages = [{
            to: receptor.pushtoken,
            sound: 'default',
            title: nombreCompleto,
            body: mensaje,
            data: {
              screen: 'ChatDetail',
              params: { tipo: 'mensaje', receptorId: emisorId }
            },
            badge: mensajesNoLeidos
          }];

          await sendExpoPushNotifications(messages);
        }

        const mensajeConDatos = await Message.findByPk(nuevoMensaje.id, {
          include: [
            { model: Usuario, as: 'emisor', attributes: ['id', 'nombre', 'apellido'] },
            { model: Usuario, as: 'receptor', attributes: ['id', 'nombre', 'apellido'] },
          ],
        });

        const mensajeParaEmitir = materializeMediaReferences(
          mensajeConDatos.toJSON(),
          getConfiguredBaseUrl(),
        );
        io.to(roomId).emit('receiveMessage', mensajeParaEmitir);

        // Actualizar mensajes no leídos
        await enviarMensajesNoLeidos(receptorId);

      } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        socket.emit('errorMessage', { error: 'No se pudo enviar el mensaje' });
      }
    });


      socket.on("marcarLeido", async ({ userId, messageId }) => {
      try {
        console.log("📩 marcarLeido recibido:", { userId, messageId });

        // Actualizar el mensaje como leído
        await Message.update(
          { leido: true },
          { where: { id: messageId, receptorId: userId } }
        );

        // Calcular mensajes no leídos restantes
        const cantidad = await Message.count({
          where: {
            receptorId: userId,
            leido: false,
          },
        });

        // Emitir al usuario su contador actualizado
        io.to(userId).emit("mensajesNoLeidos", { cantidad });

      } catch (error) {
        console.error("❌ Error marcando mensaje como leído:", error);
      }
    });
// Solicitud de foto privada
    socket.on("solicitarFoto", async ({ solicitanteId, objetivoId }) => {
      try {
        // Emitir evento para el objetivo
        io.to(objetivoId.toString()).emit("nuevaSolicitudFoto", { solicitanteId, objetivoId });

        // Guardar en DB o actualizar solicitud
        let solicitud = await SolicitudFoto.findOne({ where: { solicitanteId, objetivoId } });
        if (solicitud) {
          solicitud.estado = 'pendiente';
          await solicitud.save();
        } else {
          await SolicitudFoto.create({ solicitanteId, objetivoId, estado: 'pendiente' });
        }

        const objetivo = await Usuario.findByPk(objetivoId);
        if (objetivo?.pushtoken && Expo.isExpoPushToken(objetivo.pushtoken)) {
          await sendExpoPushNotifications([{
            to: objetivo.pushtoken,
            sound: 'default',
            title: 'Solicitud de foto privada',
            body: 'Alguien quiere ver tus fotos privadas',
            data: { screen: 'SolicitudFotos', params: { tipo: 'solicitud_foto' } },
          }]);
        }
      } catch (err) {
        console.error('❌ Error en solicitud de foto:', err);
      }
    });
    socket.on('typing', (roomId, typingUserId) => {
      socket.to(roomId).emit('typing', { typingUserId });
    });

    socket.on('stopTyping', (roomId, typingUserId) => {
      socket.to(roomId).emit('stopTyping', { typingUserId });
    });

    socket.on('imageViewed', async ({ messageId, roomId }) => {
      try {
        await Message.update({ leido: true, vista: true }, { where: { id: messageId } });
        io.to(roomId).emit('imageViewed', { messageId });
      } catch (error) {
        console.error('Error actualizando imagen vista:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Usuario desconectado:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io no inicializado!');
  }
  return io;
}

module.exports = { initSocket, getIO };
