
const { Message, User, PhotoRequest } = require('../db');
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


  async function sendUnreadMessages(userId) {
    try {
      const unreadMessages = await Message.findAll({
        where: { receiverId: userId, read: false },
      });

      io.to(userId).emit('unreadMessages', materializeMediaReferences({
        count: unreadMessages.length,
        messages: unreadMessages,
      }, getConfiguredBaseUrl()));
    } catch (error) {
      console.error('Failed to retrieve unread messages:', error);
    }
  }

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);


    socket.on('setUserId', async (userId) => {
      socket.join(userId);
      console.log(`User ${socket.id} joined user room: ${userId}`);


      await sendUnreadMessages(userId);
    });

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('sendMessage', async ({
      roomId,
      content,
      senderId,
      receiverId,
      type,
      sentAt,
      imageUrl = null,
      viewOnce = false
    }) => {
      try {
        if (await areUsersBlocked(senderId, receiverId)) {
          socket.emit('errorMessage', { error: 'You cannot send messages to this user.' });
          return;
        }

        const objectionableMatch = findObjectionableMatch(content);
        if (objectionableMatch) {
          socket.emit('errorMessage', { error: 'The message contains prohibited content.' });
          return;
        }


        const newMessage = await Message.create({
          content,
          senderId,
          receiverId,
          type,
          read: false,
          imageUrl: normalizeStorageReference(imageUrl),
          viewOnce,
          sentAt: sentAt || new Date(),
        });

        const receiver = await User.findByPk(receiverId);
        const sender = await User.findByPk(senderId);

        const capitalize = (str) => {
          if (!str) return '';
          return str
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        };
        const fullName = capitalize(`${sender.firstName} ${sender.lastName}`);


        const roomSockets = await io.in(roomId).fetchSockets();
        const receiverInRoom = roomSockets.some(s => s.handshake.query.userId === receiverId);

        if (receiver?.pushToken && Expo.isExpoPushToken(receiver.pushToken) && !receiverInRoom) {
          const unreadMessages = await Message.count({
            where: { receiverId, read: false }
          });

          const messages = [{
            to: receiver.pushToken,
            sound: 'default',
            title: fullName,
            body: content,
            data: {
              screen: 'ChatDetail',
              params: { type: 'message', senderId }
            },
            badge: unreadMessages
          }];

          await sendExpoPushNotifications(messages);
        }

        const messageWithRelations = await Message.findByPk(newMessage.id, {
          include: [
            { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName'] },
            { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName'] },
          ],
        });

        const outboundMessage = materializeMediaReferences(
          messageWithRelations.toJSON(),
          getConfiguredBaseUrl(),
        );
        io.to(roomId).emit('receiveMessage', outboundMessage);


        await sendUnreadMessages(receiverId);

      } catch (error) {
        console.error('❌ Failed to send message:', error);
        socket.emit('errorMessage', { error: 'The message could not be sent' });
      }
    });


      socket.on('markAsRead', async ({ userId, messageId }) => {
      try {
        console.log('markAsRead received:', { userId, messageId });


        await Message.update(
          { read: true },
          { where: { id: messageId, receiverId: userId } }
        );


        const count = await Message.count({
          where: {
            receiverId: userId,
            read: false,
          },
        });


        io.to(userId).emit('unreadMessages', { count });

      } catch (error) {
        console.error("❌ Failed to mark message as read:", error);
      }
    });

    socket.on('requestPhotoAccess', async ({ requesterId, targetUserId }) => {
      try {

        io.to(targetUserId.toString()).emit('newPhotoRequest', { requesterId, targetUserId });


        let photoRequest = await PhotoRequest.findOne({ where: { requesterId, targetUserId } });
        if (photoRequest) {
          photoRequest.status = 'pending';
          await photoRequest.save();
        } else {
          await PhotoRequest.create({ requesterId, targetUserId, status: 'pending' });
        }

        const targetUser = await User.findByPk(targetUserId);
        if (targetUser?.pushToken && Expo.isExpoPushToken(targetUser.pushToken)) {
          await sendExpoPushNotifications([{
            to: targetUser.pushToken,
            sound: 'default',
            title: 'Private photo request',
            body: 'Someone wants to view your private photos',
            data: { screen: 'Requests', params: { type: 'photo_request' } },
          }]);
        }
      } catch (err) {
        console.error('❌ Photo request error:', err);
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
        await Message.update({ read: true, viewed: true }, { where: { id: messageId } });
        io.to(roomId).emit('imageViewed', { messageId });
      } catch (error) {
        console.error('Failed to update viewed image:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized.');
  }
  return io;
}

module.exports = { initSocket, getIO };
