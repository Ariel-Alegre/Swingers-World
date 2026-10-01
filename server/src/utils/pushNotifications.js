const { Expo } = require('expo-server-sdk');

const expo = new Expo(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined);

function scheduleReceiptCheck(receiptTargets) {
  if (!receiptTargets.length) return;

  const timeout = setTimeout(async () => {
    const tokenByReceiptId = new Map(receiptTargets.map((item) => [item.id, item.token]));
    for (const chunk of expo.chunkPushNotificationReceiptIds(receiptTargets.map((item) => item.id))) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'error') {
            console.error('Expo rejected a push notification:', {
              receiptId,
              message: receipt.message,
              details: receipt.details,
            });
            if (receipt.details?.error === 'DeviceNotRegistered') {
              try {
                const { PushToken, User } = require('../db');
                const invalidToken = tokenByReceiptId.get(receiptId);
                if (invalidToken) {
                  await PushToken.update({ active: false }, { where: { token: invalidToken } });
                  await User.update({ pushToken: null }, { where: { pushToken: invalidToken } });
                }
              } catch (cleanupError) {
                console.error('Failed to deactivate an invalid push token:', cleanupError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to retrieve Expo push receipts:', error);
      }
    }
  }, 15000);

  timeout.unref?.();
}

async function sendExpoPushNotifications(messages) {
  const validMessages = messages.filter((message) => Expo.isExpoPushToken(message.to));
  if (!validMessages.length) return [];

  const tickets = [];
  const receiptTargets = [];
  for (const chunk of expo.chunkPushNotifications(validMessages)) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
      chunkTickets.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          console.error('Expo did not accept a push notification:', {
            message: ticket.message,
            details: ticket.details,
          });
        } else if (ticket.id) {
          receiptTargets.push({ id: ticket.id, token: chunk[index].to });
        }
      });
    } catch (error) {
      console.error('Failed to send push notifications through Expo:', error);
    }
  }

  scheduleReceiptCheck(receiptTargets);
  return tickets;
}

module.exports = { sendExpoPushNotifications };
