
const { Message, User, Profile } = require('../db');
const { Op } = require('sequelize');
const jwt = require('../utils/jwt');
const { getDisplayName, notifyUser } = require('../utils/notificationService');
const { areUsersBlocked } = require('../utils/blocks');
const { findObjectionableMatch } = require('../utils/safety');
const { isProfileComplete } = require('../utils/profileCompletion');
const { deleteStoredObject, normalizeStorageReference, materializeMediaReferences, getConfiguredBaseUrl } = require('../utils/objectStorage');

let io;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  async function markPendingMessagesDelivered(userId) {
    const pendingMessages = await Message.findAll({
      where: { receiverId: userId, deliveredAt: null, receiverDeleted: false },
      attributes: ['id', 'senderId'],
    });
    if (!pendingMessages.length) return;

    const deliveredAt = new Date();
    const messageIds = pendingMessages.map((message) => message.id);
    await Message.update({ deliveredAt }, { where: { id: { [Op.in]: messageIds } } });

    const senderIds = [...new Set(pendingMessages.map((message) => message.senderId))];
    for (const senderId of senderIds) {
      const senderMessageIds = pendingMessages
        .filter((message) => message.senderId === senderId)
        .map((message) => message.id);
      io.to(senderId.toString()).emit('messagesDelivered', {
        receiverId: userId,
        messageIds: senderMessageIds,
        deliveredAt: deliveredAt.toISOString(),
      });
    }
  }


  async function sendUnreadMessages(userId) {
    try {
      const unreadMessages = await Message.findAll({
        where: { receiverId: userId, read: false, receiverDeleted: false, receiverArchived: false },
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
    socket.join(socket.userId.toString());
    void sendUnreadMessages(socket.userId);
    void markPendingMessagesDelivered(socket.userId).catch((error) => {
      console.error('Failed to mark messages as delivered:', error);
    });
    console.log('✅ User connected:', socket.id);


    socket.on('setUserId', async (userId) => {
      if (userId !== socket.userId) return;
      socket.join(userId);
      console.log(`User ${socket.id} joined user room: ${userId}`);


      await sendUnreadMessages(userId);
    });

    socket.on('joinRoom', async ({ otherUserId }) => {
      if (!otherUserId || await areUsersBlocked(socket.userId, otherUserId)) return;
      const roomId = [socket.userId, otherUserId].sort().join('-');
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('leaveRoom', ({ otherUserId }) => {
      if (!otherUserId) return;
      const roomId = [socket.userId, otherUserId].sort().join('-');
      socket.leave(roomId);
    });

    socket.on('sendMessage', async ({
      roomId,
      content,
      senderId,
      receiverId,
      type,
      sentAt,
      imageUrl = null,
      audioUrl = null,
      audioDurationMs = null,
      viewOnce = false
    }) => {
      try {
        if (senderId !== socket.userId) {
          socket.emit('errorMessage', { error: 'Invalid message sender.' });
          return;
        }

        const sender = await User.findByPk(socket.userId, { include: [{ model: Profile }] });
        if (!sender || !isProfileComplete(sender.Profile)) {
          socket.emit('errorMessage', {
            code: 'PROFILE_INCOMPLETE',
            error: 'Complete your profile before sending messages.',
          });
          return;
        }
        const safeRoomId = [socket.userId, receiverId].sort().join('-');
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
          audioUrl: normalizeStorageReference(audioUrl),
          audioDurationMs: Number.isFinite(Number(audioDurationMs)) ? Number(audioDurationMs) : null,
          viewOnce: Boolean(imageUrl) && ['true', '1'].includes(String(viewOnce).toLowerCase()),
          sentAt: sentAt || new Date(),
        });

        const receiverSockets = await io.in(receiverId.toString()).fetchSockets();
        const receiverInRoom = receiverSockets.length > 0;
        if (receiverInRoom) {
          newMessage.deliveredAt = new Date();
          await newMessage.save();
        }

        const conversationSockets = await io.in(safeRoomId).fetchSockets();
        const receiverViewingConversation = conversationSockets.some(
          (connectedSocket) => connectedSocket.userId === receiverId,
        );
        if (!receiverViewingConversation) {
          const unreadMessages = await Message.count({
            where: { receiverId, read: false, receiverDeleted: false, receiverArchived: false },
          });
          await notifyUser({
            userId: receiverId,
            type: 'message',
            actorName: getDisplayName(sender),
            preview: typeof content === 'string' ? content.trim().slice(0, 120) : '',
            image: type === 'image' || Boolean(imageUrl),
            audio: type === 'audio' || Boolean(audioUrl),
            persist: false,
            badge: unreadMessages,
            data: { senderId, actorName: getDisplayName(sender) },
          }).catch((error) => console.error('Failed to notify the message recipient:', error));
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
        if (newMessage.viewOnce) {
          io.to(receiverId.toString()).emit('receiveMessage', outboundMessage);
          io.to(senderId.toString()).emit('receiveMessage', { ...outboundMessage, imageUrl: null });
        } else {
          io.to(safeRoomId).emit('receiveMessage', outboundMessage);
        }


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
            receiverDeleted: false,
            receiverArchived: false,
          },
        });


        io.to(userId).emit('unreadMessages', { count });

      } catch (error) {
        console.error("❌ Failed to mark message as read:", error);
      }
    });

    socket.on('typing', ({ otherUserId }) => {
      if (!otherUserId) return;
      const roomId = [socket.userId, otherUserId].sort().join('-');
      socket.to(roomId).emit('typing', { typingUserId: socket.userId });
      io.to(otherUserId.toString()).emit('conversationTyping', { typingUserId: socket.userId });
    });

    socket.on('stopTyping', ({ otherUserId }) => {
      if (!otherUserId) return;
      const roomId = [socket.userId, otherUserId].sort().join('-');
      socket.to(roomId).emit('stopTyping', { typingUserId: socket.userId });
      io.to(otherUserId.toString()).emit('conversationStopTyping', { typingUserId: socket.userId });
    });

    socket.on('imageViewed', async ({ messageId }) => {
      try {
        const message = await Message.findOne({
          where: { id: messageId, receiverId: socket.userId, viewOnce: true },
        });
        if (!message?.imageUrl) return;
        const storedImage = message.imageUrl;
        message.imageUrl = null;
        message.viewed = true;
        message.read = true;
        message.readAt = message.readAt || new Date();
        await message.save();
        await deleteStoredObject(storedImage).catch((error) => {
          console.warn('Failed to delete a viewed image from the bucket:', error);
        });
        const safeRoomId = [message.senderId, message.receiverId].sort().join('-');
        io.to(safeRoomId).emit('messageViewed', { messageId, viewedAt: message.readAt.toISOString() });
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
