const { Expo } = require('expo-server-sdk');
const { sendExpoPushNotifications } = require('./pushNotifications');

const copy = {
  es: {
    messageTitle: ({ actorName }) => actorName,
    messageBody: ({ actorName, preview, image, audio }) => audio
      ? `${actorName} te envió un audio.`
      : image ? `${actorName} te envió una imagen.` : `${actorName}: ${preview || 'Nuevo mensaje'}`,
    photo_requestTitle: () => 'Solicitud de fotos privadas',
    photo_requestBody: ({ actorName }) => `Solicitud de ${actorName} para ver tus fotos privadas.`,
    photo_request_acceptedTitle: () => 'Solicitud aceptada',
    photo_request_acceptedBody: ({ actorName }) => `Tu solicitud para ver las fotos privadas de ${actorName} fue aceptada.`,
    photo_request_rejectedTitle: () => 'Solicitud rechazada',
    photo_request_rejectedBody: ({ actorName }) => `Tu solicitud para ver las fotos privadas de ${actorName} fue rechazada.`,
    photo_request_pendingTitle: () => 'Solicitud pendiente',
    photo_request_pendingBody: ({ actorName }) => `La solicitud para ver las fotos privadas de ${actorName} volvió a quedar pendiente.`,
    like_receivedTitle: () => 'Le interesás a alguien',
    like_receivedBody: ({ actorName }) => `Nuevo interés en tu perfil: ${actorName}.`,
  },
  en: {
    messageTitle: ({ actorName }) => actorName,
    messageBody: ({ actorName, preview, image, audio }) => audio
      ? `${actorName} sent you a voice message.`
      : image ? `${actorName} sent you an image.` : `${actorName}: ${preview || 'New message'}`,
    photo_requestTitle: () => 'Private photo request',
    photo_requestBody: ({ actorName }) => `${actorName} requested access to your private photos.`,
    photo_request_acceptedTitle: () => 'Request accepted',
    photo_request_acceptedBody: ({ actorName }) => `${actorName} accepted your request to view their private photos.`,
    photo_request_rejectedTitle: () => 'Request rejected',
    photo_request_rejectedBody: ({ actorName }) => `${actorName} rejected your request to view their private photos.`,
    photo_request_pendingTitle: () => 'Request pending',
    photo_request_pendingBody: ({ actorName }) => `${actorName} marked your request as pending again.`,
    like_receivedTitle: () => 'Someone is interested in you',
    like_receivedBody: ({ actorName }) => `${actorName} is interested in your profile.`,
  },
};

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'es';
}

function getDisplayName(user) {
  if (!user) return 'Swingers World';
  return user.Profile?.displayName?.trim()
    || `${user.firstName || ''} ${user.lastName || ''}`.trim()
    || 'Swingers World';
}

function localizedContent(locale, type, variables = {}) {
  const language = copy[normalizeLocale(locale)];
  const titleFactory = language[`${type}Title`];
  const bodyFactory = language[`${type}Body`];
  if (!titleFactory || !bodyFactory) throw new Error(`Unsupported notification type: ${type}`);
  return { title: titleFactory(variables), body: bodyFactory(variables) };
}

async function notifyUser({
  userId,
  type,
  actorName = 'Swingers World',
  preview = '',
  image = false,
  audio = false,
  relatedId = null,
  data = {},
  badge,
  persist = true,
  push = true,
}) {
  const { User, PushToken, Notification } = require('../db');
  const recipient = await User.findByPk(userId);
  if (!recipient) return null;

  const defaultLocale = normalizeLocale(recipient.notificationLocale);
  const defaultContent = localizedContent(defaultLocale, type, { actorName, preview, image, audio });
  let notification = null;

  if (persist) {
    notification = await Notification.create({
      userId,
      type,
      description: defaultContent.body,
      relatedId,
      read: false,
    });
    try {
      const { getIO } = require('../controllers/socket');
      getIO().to(userId.toString()).emit('notificationCreated', notification.toJSON());
    } catch {
      // Persistence and push delivery must not depend on the realtime transport.
    }
  }

  if (push) {
    const deviceTokens = await PushToken.findAll({ where: { userId, active: true } });
    const targets = deviceTokens.length
      ? deviceTokens.map((device) => ({ token: device.token, locale: normalizeLocale(device.locale) }))
      : Expo.isExpoPushToken(recipient.pushToken)
        ? [{ token: recipient.pushToken, locale: defaultLocale }]
        : [];
    const uniqueTargets = Array.from(new Map(targets.map((target) => [target.token, target])).values());
    const messages = uniqueTargets.map((target) => {
      const content = localizedContent(target.locale, type, { actorName, preview, image, audio });
      return {
        to: target.token,
        sound: 'default',
        priority: 'high',
        channelId: type === 'message' ? 'messages' : 'activity',
        title: content.title,
        body: content.body,
        data: { type, relatedId, ...data },
        ...(Number.isFinite(badge) ? { badge } : {}),
      };
    });
    if (messages.length) await sendExpoPushNotifications(messages);
  }

  return notification;
}

module.exports = { getDisplayName, localizedContent, notifyUser, normalizeLocale };
