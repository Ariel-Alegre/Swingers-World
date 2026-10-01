require('dotenv').config();
const { Op, Sequelize } = require('sequelize');
const { Message, User, Profile } = require('../db');
const { getIO } = require('../controllers/socket');
const { getDisplayName, notifyUser } = require('../utils/notificationService');
const { areUsersBlocked, getBlockedUserIdsForUser } = require('../utils/blocks');
const { findObjectionableMatch } = require('../utils/safety');
const { isProfileComplete } = require('../utils/profileCompletion');
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

    const otherUserId = req.userId === senderId ? receiverId : senderId;
    const whereClause = {
      [Op.or]: [
        { senderId: req.userId, receiverId: otherUserId, senderDeleted: false },
        { senderId: otherUserId, receiverId: req.userId, receiverDeleted: false },
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
  let audioUrl = null;
  let uploadedReference = null;
  let messagePersisted = false;

  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'senderId and receiverId are required' });
    }

    const sender = await User.findByPk(senderId, { include: [{ model: Profile }] });
    if (!sender || !isProfileComplete(sender.Profile)) {
      return res.status(403).json({
        code: 'PROFILE_INCOMPLETE',
        message: 'Complete your profile before sending messages.',
      });
    }

    if (await areUsersBlocked(senderId, receiverId)) {
      return res.status(403).json({ error: 'You cannot send messages to this user.' });
    }

    const objectionableMatch = findObjectionableMatch(content);
    if (objectionableMatch) {
      return res.status(400).json({ error: 'The message contains prohibited content.' });
    }

    const mediaFile = req.file || req.files?.media?.[0] || req.files?.image?.[0];
    if (mediaFile?.buffer) {
      const isAudio = String(mediaFile.mimetype || '').startsWith('audio/');
      uploadedReference = await uploadFile(mediaFile, isAudio ? 'chat-audio' : 'chat-images');
      if (isAudio) audioUrl = uploadedReference;
      else imageUrl = uploadedReference;
    } else {
      if (req.body.imageUrl) imageUrl = normalizeStorageReference(req.body.imageUrl);
      if (req.body.audioUrl) audioUrl = normalizeStorageReference(req.body.audioUrl);
    }

    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    if (!normalizedContent && !imageUrl && !audioUrl) {
      return res.status(400).json({ error: 'A message, image, or audio recording is required.' });
    }
    const parsedDuration = Number(req.body.audioDurationMs);
    const audioDurationMs = audioUrl && Number.isFinite(parsedDuration)
      ? Math.max(0, Math.min(Math.round(parsedDuration), 5 * 60 * 1000))
      : null;
    const messageType = audioUrl ? 'audio' : imageUrl ? 'image' : 'text';

    const newMessage = await Message.create({
      senderId,
      receiverId,
      content: normalizedContent || null,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      audioDurationMs,
      type: messageType,
      viewOnce: false,
      viewed: false,
      read: false,
      sentAt: new Date(),
    });
    messagePersisted = true;

    try {
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
        where: { receiverId, read: false, receiverDeleted: false, receiverArchived: false },
      });
      io.to(receiverId.toString()).emit('unreadMessages', { count: unreadMessages });

      const conversationSockets = await io.in(roomId).fetchSockets();
      const receiverViewingConversation = conversationSockets.some(
        (connectedSocket) => connectedSocket.userId === receiverId,
      );
      if (!receiverViewingConversation) {
        await notifyUser({
          userId: receiverId,
          type: 'message',
          actorName: getDisplayName(sender),
          preview: normalizedContent.slice(0, 120),
          image: Boolean(imageUrl),
          audio: Boolean(audioUrl),
          persist: false,
          badge: unreadMessages,
          data: { senderId, actorName: getDisplayName(sender) },
        }).catch((error) => console.error('Failed to notify the message recipient:', error));
      }
    } catch (realtimeError) {
      console.error('The message was saved, but its realtime update failed:', realtimeError);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    if (uploadedReference && !messagePersisted) {
      await deleteStoredObject(uploadedReference).catch(() => undefined);
    }
    console.error('❌ Failed to create message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};




const getConversations = async (req, res) => {
  const { userId } = req.query;
  const includeArchived = req.query.archived === 'true';
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (req.userId !== userId) return res.status(403).json({ error: 'You cannot access these conversations' });

  try {
    const blockedUserIds = await getBlockedUserIdsForUser(userId);

    const messages = await Message.findAll({
      where: {
        [Op.and]: [
          { [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
          {
            [Op.or]: [
              { senderId: userId, senderDeleted: false },
              { receiverId: userId, receiverDeleted: false },
            ],
          },
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
        'type',
        'senderArchived',
        'receiverArchived',
        [
          Sequelize.literal(
            `CASE WHEN "senderId" = '${userId}' THEN "receiverId" ELSE "senderId" END`
          ),
          'participantId',
        ],
      ],
      order: [['sentAt', 'DESC']],
    });

    const latestConversationMap = new Map();
    const unreadCounts = new Map();

    for (const m of messages) {
      const participantId = m.get('participantId');
      if (!latestConversationMap.has(participantId)) {
        latestConversationMap.set(participantId, m);
      }
      const archivedForUser = m.senderId === userId ? m.senderArchived : m.receiverArchived;
      if (m.receiverId === userId && m.senderId !== userId && m.read === false && Boolean(archivedForUser) === includeArchived) {
        unreadCounts.set(m.senderId, (unreadCounts.get(m.senderId) || 0) + 1);
      }
    }

    const conversationMap = new Map(
      Array.from(latestConversationMap.entries()).filter(([, message]) => {
        const archivedForUser = message.senderId === userId
          ? message.senderArchived
          : message.receiverArchived;
        return Boolean(archivedForUser) === includeArchived;
      }),
    );

    const participantIds = Array.from(conversationMap.keys());

    const participants = await User.findAll({
      where: {
        id: participantIds.filter((id) => !blockedUserIds.includes(id)),
      },
      include: [{ model: Profile }],
    });

    const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
    const result = participantIds.map((participantId) => {
      const user = participantsById.get(participantId);
      if (!user) return null;
      const content = conversationMap.get(user.id);
      return {
        participantId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.Profile?.photos?.[0]?.url ?? null,
        lastMessage: content.content,
        lastMessageType: content.type,
        lastMessageAt: content.sentAt,
        isIncoming: content.senderId !== userId,
        read: content.senderId !== userId && content.read === true,
        unreadCount: unreadCounts.get(user.id) || 0,
      };
    }).filter(Boolean);

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
      where: { senderId, receiverId, read: false, receiverDeleted: false },
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
      where: { receiverId, read: false, receiverDeleted: false, receiverArchived: false },
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
        receiverDeleted: false,
        receiverArchived: false,
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

const deleteConversation = async (req, res) => {
  const userId = req.userId;
  const { participantId } = req.params;
  const validParticipantId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId || '');

  if (!validParticipantId || participantId === userId) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid participant is required.' });
  }

  try {
    const [[outgoingCount], [incomingCount]] = await Promise.all([
      Message.update(
        { senderDeleted: true },
        { where: { senderId: userId, receiverId: participantId, senderDeleted: false } },
      ),
      Message.update(
        { receiverDeleted: true },
        { where: { senderId: participantId, receiverId: userId, receiverDeleted: false } },
      ),
    ]);

    const unreadCount = await Message.count({
      where: { receiverId: userId, read: false, receiverDeleted: false, receiverArchived: false },
    });
    const io = getIO();
    io.to(userId.toString()).emit('conversationDeleted', { participantId });
    io.to(userId.toString()).emit('unreadMessages', { count: unreadCount });

    return res.json({ success: true, deletedMessages: outgoingCount + incomingCount });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to delete conversation.' });
  }
};

const archiveConversation = async (req, res) => {
  const userId = req.userId;
  const { participantId } = req.params;
  const validParticipantId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId || '');

  if (!validParticipantId || participantId === userId) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid participant is required.' });
  }

  try {
    const [[outgoingCount], [incomingCount]] = await Promise.all([
      Message.update(
        { senderArchived: true },
        { where: { senderId: userId, receiverId: participantId, senderDeleted: false, senderArchived: false } },
      ),
      Message.update(
        { receiverArchived: true },
        { where: { senderId: participantId, receiverId: userId, receiverDeleted: false, receiverArchived: false } },
      ),
    ]);

    const unreadCount = await Message.count({
      where: {
        receiverId: userId,
        read: false,
        receiverDeleted: false,
        receiverArchived: false,
      },
    });
    const io = getIO();
    io.to(userId.toString()).emit('conversationArchived', { participantId });
    io.to(userId.toString()).emit('unreadMessages', { count: unreadCount });

    return res.json({ success: true, archivedMessages: outgoingCount + incomingCount });
  } catch (error) {
    console.error('Failed to archive conversation:', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to archive conversation.' });
  }
};

const unarchiveConversation = async (req, res) => {
  const userId = req.userId;
  const { participantId } = req.params;
  const validParticipantId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId || '');

  if (!validParticipantId || participantId === userId) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid participant is required.' });
  }

  try {
    const [[outgoingCount], [incomingCount]] = await Promise.all([
      Message.update(
        { senderArchived: false },
        { where: { senderId: userId, receiverId: participantId, senderDeleted: false, senderArchived: true } },
      ),
      Message.update(
        { receiverArchived: false },
        { where: { senderId: participantId, receiverId: userId, receiverDeleted: false, receiverArchived: true } },
      ),
    ]);

    const unreadCount = await Message.count({
      where: { receiverId: userId, read: false, receiverDeleted: false, receiverArchived: false },
    });
    const io = getIO();
    io.to(userId.toString()).emit('conversationUnarchived', { participantId });
    io.to(userId.toString()).emit('unreadMessages', { count: unreadCount });

    return res.json({ success: true, unarchivedMessages: outgoingCount + incomingCount });
  } catch (error) {
    console.error('Failed to unarchive conversation:', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to unarchive conversation.' });
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
  deleteConversation,
  archiveConversation,
  unarchiveConversation,
};
