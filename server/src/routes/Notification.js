const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const { GetNotifications, MarkNotificationsAsRead, MarkNotificationAsRead } = require('../controllers/Notification');

const router = express.Router();

router.get('/notifications', authenticateToken, GetNotifications);
router.patch('/notifications/read', authenticateToken, MarkNotificationsAsRead);
router.patch('/notifications/:id/read', authenticateToken, MarkNotificationAsRead);

module.exports = router;
