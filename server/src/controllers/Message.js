require('dotenv').config();
const { Op, Sequelize } = require('sequelize');
const { Message, User, Profile } = require('../db');
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

const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId, before } = req.query;

    if (req.userId !== senderId && req.userId !== receiverId) {
      return res.status(403).json({ message: 'You cannot access this conversation' });
    }

    if (await areUsersBlocked(senderId, receiverId)) {
      return res.json([]);
    }

    const whereClause = {
      [Op.or]: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    };

    if (before) {
      whereClause.sentAt = { [Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where: whereClause,
      order: [['sentAt', 'DESC']],
      limit: 50,
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve messages' });
  }
};




const createMessage = async (req, res) => {
  const senderId = req.userId;
  const { receiverId, content } = req.body;


  let imageUrl = null;

  try {
    if (req.file && req.file.buffer) {
      imageUrl = await uploadFile(req.file, 'chat-images');
    } else if (req.body.imageUrl) {
      imageUrl = normalizeStorageReference(req.body.imageUrl);
    }

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'senderId and receiverId are required' });
    }

    if (await areUsersBlocked(senderId, receiverId)) {
      return res.status(403).json({ error: 'You cannot send messages to this user.' });
    }

    const objectionableMatch = findObjectionableMatch(content);
    if (objectionableMatch) {
      return res.status(400).json({ error: 'The message contains prohibited content.' });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      content: content || null,
      imageUrl: imageUrl || null,
      type: imageUrl ? 'image' : 'text',
      viewOnce: true,
      viewed: false,
      read: false,
      sentAt: new Date(),
    });


    const io = getIO();
    const roomId = [senderId, receiverId].sort().join('-');
    const receiverSockets = await io.in(receiverId.toString()).fetchSockets();
    if (receiverSockets.length) {
      newMessage.deliveredAt = new Date();
      await newMessage.save();
      io.to(senderId.toString()).emit('messagesDelivered', {
        receiverId,
        messageIds: [newMessage.id],
        deliveredAt: newMessage.deliveredAt.toISOString(),
      });
    }
    io.to(roomId).emit(
      'receiveMessage',
      materializeMediaReferences(newMessage, getRequestBaseUrl(req)),
    );

    const unreadMessages = await Message.count({
      where: { receiverId, read: false },
    });
    io.to(receiverId.toString()).emit('unreadMessages', { count: unreadMessages });


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
    if (receiver && receiver.pushToken && Expo.isExpoPushToken(receiver.pushToken)) {

      const messages = [{
        to: receiver.pushToken,
        sound: 'default',
        title: fullName,
        body: content?.slice(0, 50) || 'New message',
        data: {
          screen: 'ChatDetail',
          params: { type: 'message', senderId }
        }
        ,
        badge: unreadMessages
      }];

      await sendExpoPushNotifications(messages);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('❌ Failed to create message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};




const getConversations = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (req.userId !== userId) return res.status(403).json({ error: 'You cannot access these conversations' });

  try {
    const blockedUserIds = await getBlockedUserIdsForUser(userId);

    const messages = await Message.findAll({
      where: {
        [Op.and]: [
          { [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
          {
            senderId: { [Op.notIn]: blockedUserIds },
          },
          {
            receiverId: { [Op.notIn]: blockedUserIds },
          },
        ],
      },
      attributes: [
        'id',
        'content',
        'sentAt',
        'senderId',
        'receiverId',
        'read',
        [
          Sequelize.literal(
            `CASE WHEN "senderId" = '${userId}' THEN "receiverId" ELSE "senderId" END`
          ),
          'participantId',
        ],
      ],
      order: [['sentAt', 'DESC']],
    });

    const conversationMap = new Map();
    const unreadCounts = new Map();

    for (const m of messages) {
      const participantId = m.get('participantId');
      if (!conversationMap.has(participantId)) {
        conversationMap.set(participantId, m);
      }
      if (m.receiverId === userId && m.senderId !== userId && m.read === false) {
        unreadCounts.set(m.senderId, (unreadCounts.get(m.senderId) || 0) + 1);
      }
    }

    const participantIds = Array.from(conversationMap.keys());

    const participants = await User.findAll({
      where: {
        id: participantIds.filter((id) => !blockedUserIds.includes(id)),
      },
      include: [{ model: Profile }],
    });

    const result = participants.map((user) => {
      const content = conversationMap.get(user.id);
      return {
        participantId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.Profile?.photos?.[0]?.url ?? null,
        lastMessage: content.content,
        lastMessageAt: content.sentAt,
        isIncoming: content.senderId !== userId,
        read: content.senderId !== userId && content.read === true,
        unreadCount: unreadCounts.get(user.id) || 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Failed to retrieve conversations:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;
    const receiverId = req.userId;
    if (!senderId) return res.status(400).json({ error: 'senderId is required' });

    const unreadMessages = await Message.findAll({
      where: { senderId, receiverId, read: false },
      attributes: ['id'],
    });
    const messageIds = unreadMessages.map((message) => message.id);
    const readAt = new Date();

    if (messageIds.length) {
      await Message.update(
        { read: true, readAt, deliveredAt: readAt },
        { where: { id: { [Op.in]: messageIds } } },
      );
      getIO().to(senderId.toString()).emit('messagesRead', {
        readerId: receiverId,
        messageIds,
        readAt: readAt.toISOString(),
      });
    }



    const count = await Message.count({
      where: { receiverId, read: false },
    });
    getIO().to(receiverId.toString()).emit('unreadMessages', { count });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to mark messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

const getUnreadMessageCounts = async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const unreadMessages = await Message.findAll({
      where: {
        receiverId: userId,
        read: false,
      },
      attributes: [
        'senderId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.col('senderId')],
      raw: true,
    });

    res.json(unreadMessages);
  } catch (error) {
    console.error('❌ Failed to retrieve notifications:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
};



const markImageAsViewed = async (req, res) => {
  const { messageId } = req.body;

  try {
    const content = await Message.findByPk(messageId);

    if (!content) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (content.viewOnce) {

      content.viewed = true;
      await content.save();


      if (content.imageUrl) {
        try {
          await deleteStoredObject(content.imageUrl);
        } catch (err) {
          console.warn('Failed to delete the image from the bucket:', err);
        }
      }


      await content.destroy();


      const io = getIO();
      const roomId = [content.senderId, content.receiverId].sort().join('-');
      io.to(roomId).emit('messageDeleted', { messageId });

      return res.json({ success: true, message: 'Message deleted after the image was viewed' });
    }

    res.status(400).json({ error: 'The message is not configured for one-time viewing' });
  } catch (error) {
    console.error('❌ Failed to mark the image as viewed and delete it:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.body;

  try {
    const content = await Message.findByPk(messageId);
    if (!content) return res.status(404).json({ error: 'Message not found' });

    if (content.viewOnce) {

      if (content.imageUrl) {
        try {
          await deleteStoredObject(content.imageUrl);
        } catch (err) {
          console.warn('Failed to delete the image from the bucket:', err);
        }
      }

      await content.destroy();
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'The message is not configured for one-time viewing' });
    }
  } catch (error) {
    console.error('❌ Failed to delete message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  createMessage,
  getMessages,
  getConversations,
  markAsRead,
  getUnreadMessageCounts,
  markImageAsViewed,
  deleteMessage,
};
