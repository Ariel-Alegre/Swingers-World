const express = require('express');
const upload = require('../middleware/uploadImage');
const authenticateToken = require('../middleware/authenticateToken');
const {
  createMessage,
  getMessages,
  getConversations,
  markAsRead,
  getUnreadMessageCounts,
  deleteMessage,
  deleteConversation,
  archiveConversation,
  unarchiveConversation,
  markImageAsViewed,
} = require('../controllers/Message');

const router = express.Router();

router.post('/messages', authenticateToken, upload.single('image'), createMessage);
router.get('/messages', authenticateToken, getMessages);
router.get('/conversations', authenticateToken, getConversations);
router.delete('/conversations/:participantId', authenticateToken, deleteConversation);
router.patch('/conversations/:participantId/archive', authenticateToken, archiveConversation);
router.patch('/conversations/:participantId/unarchive', authenticateToken, unarchiveConversation);
router.post('/messages/read', authenticateToken, markAsRead);
router.get('/unread-message-counts', authenticateToken, getUnreadMessageCounts);
router.post('/messages/delete', authenticateToken, deleteMessage);
router.post('/messages/image-viewed', authenticateToken, markImageAsViewed);

module.exports = router;
