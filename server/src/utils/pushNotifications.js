const { Expo } = require('expo-server-sdk');

const expo = new Expo();

function scheduleReceiptCheck(ticketIds) {
  if (!ticketIds.length) return;

  const timeout = setTimeout(async () => {
    for (const chunk of expo.chunkPushNotificationReceiptIds(ticketIds)) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'error') {
            console.error('Expo rejected a push notification:', {
              receiptId,
              message: receipt.message,
              details: receipt.details,
            });
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
  for (const chunk of expo.chunkPushNotifications(validMessages)) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
      chunkTickets.forEach((ticket) => {
        if (ticket.status === 'error') {
          console.error('Expo did not accept a push notification:', {
            message: ticket.message,
            details: ticket.details,
          });
        }
      });
    } catch (error) {
      console.error('Failed to send push notifications through Expo:', error);
    }
  }

  scheduleReceiptCheck(
    tickets.filter((ticket) => ticket.status === 'ok' && ticket.id).map((ticket) => ticket.id),
  );
  return tickets;
}

module.exports = { sendExpoPushNotifications };
