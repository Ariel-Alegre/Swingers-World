const { Op } = require('sequelize');
const { Notification } = require('../db');

const visibleNotificationWhere = (userId) => ({
  userId,
  [Op.or]: [
    { type: 'photo_request' },
    { type: 'photo_request_accepted' },
    {
      type: 'photo_response',
      description: { [Op.iLike]: '%granted access%' },
    },
  ],
});

const GetNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: visibleNotificationWhere(req.userId),
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'type', 'description', 'read', 'relatedId', 'createdAt'],
    });

    res.json(notifications.map((notification) => {
      const value = notification.toJSON();
      if (value.type === 'photo_response') {
        value.type = 'photo_request_accepted';
      }
      return value;
    }));
  } catch (error) {
    console.error('Failed to retrieve notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const MarkNotificationsAsRead = async (req, res) => {
  try {
    await Notification.update(
      { read: true },
      { where: { ...visibleNotificationWhere(req.userId), read: false } },
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const MarkNotificationAsRead = async (req, res) => {
  try {
    const [updatedCount] = await Notification.update(
      { read: true },
      { where: { id: req.params.id, userId: req.userId } },
    );
    if (!updatedCount) return res.status(404).json({ message: 'Notification not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { GetNotifications, MarkNotificationsAsRead, MarkNotificationAsRead };
