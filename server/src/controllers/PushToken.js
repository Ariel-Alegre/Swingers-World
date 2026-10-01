require('dotenv').config();
const { Op } = require('sequelize');
const { Expo } = require('expo-server-sdk');
const { User, PushToken } = require('../db');

module.exports = {
  UpdateNotificationPreferences: async (req, res) => {
    try {
      const notificationLocale = req.body?.locale === 'en' ? 'en' : 'es';
      const [updatedCount] = await User.update(
        { notificationLocale },
        { where: { id: req.userId } },
      );
      if (!updatedCount) return res.status(404).json({ error: 'User not found' });
      return res.json({ ok: true, locale: notificationLocale });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  SavePushToken: async (req, res) => {
    const userId = req.userId || req.body.userId;
    const { token, locale, platform } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Required data is missing" });
    }

    try {
      const normalizedToken = String(token).trim();
      if (!Expo.isExpoPushToken(normalizedToken)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'The Expo push token is invalid.' });
      }
      const normalizedLocale = locale === 'en' ? 'en' : 'es';
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      
      await PushToken.destroy({
        where: { token: normalizedToken, userId: { [Op.ne]: userId } },
      });
      const [deviceToken] = await PushToken.findOrCreate({
        where: { userId, token: normalizedToken },
        defaults: {
          locale: normalizedLocale,
          platform: platform ? String(platform).slice(0, 20) : null,
          active: true,
          lastSeenAt: new Date(),
        },
      });
      await deviceToken.update({
        locale: normalizedLocale,
        platform: platform ? String(platform).slice(0, 20) : null,
        active: true,
        lastSeenAt: new Date(),
      });
      await user.update({ pushToken: normalizedToken, notificationLocale: normalizedLocale });

      res.json({ 
        ok: true, 
        message: "Token saved successfully", 
        pushToken: normalizedToken,
      });
    } catch (error) {
      console.error("❌ Failed to save token:", error);
      res.status(500).json({ error: "Internal error" });
    }
  },

  DeletePushToken: async (req, res) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      if (!token) return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'A push token is required.' });
      await PushToken.destroy({ where: { userId: req.userId, token } });
      await User.update({ pushToken: null }, { where: { id: req.userId, pushToken: token } });
      return res.json({ ok: true });
    } catch (error) {
      console.error('Failed to delete push token:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  },
};





































