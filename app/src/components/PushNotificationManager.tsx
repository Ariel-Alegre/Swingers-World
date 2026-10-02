import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { navigationRef } from '../lib/navigation';
import { saveRegisteredPushToken } from '../lib/pushNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushData = {
  type?: string;
  senderId?: string;
  actorName?: string;
  targetUserId?: string;
};

function openPushDestination(data: PushData, retries = 8) {
  if (!navigationRef.isReady()) {
    if (retries > 0) setTimeout(() => openPushDestination(data, retries - 1), 250);
    return;
  }

  if (data.type === 'message' && data.senderId) {
    navigationRef.navigate('ChatDetail', {
      userId: data.senderId,
      name: data.actorName || 'Swingers World',
      avatar: null,
    });
  } else if (data.type === 'photo_request') {
    navigationRef.navigate('Tabs', { screen: 'Solicitudes' });
  } else if (data.type === 'like_received') {
    navigationRef.navigate('ReceivedLikes');
  } else if (data.targetUserId) {
    navigationRef.navigate('Profile', { userId: data.targetUserId });
  } else if (data.type?.startsWith('photo_request_')) {
    navigationRef.navigate('SentPhotoRequests');
  }
}

async function registerDevice(language: 'es' | 'en') {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync('messages', {
        name: language === 'es' ? 'Mensajes' : 'Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 180, 250],
        lightColor: '#F52887',
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync('activity', {
        name: language === 'es' ? 'Actividad' : 'Activity',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 180, 250],
        lightColor: '#F5C76B',
        sound: 'default',
      }),
    ]);
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions = currentPermissions.status === 'granted'
    ? currentPermissions
    : await Notifications.requestPermissionsAsync();
  if (permissions.status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push notifications require an EAS projectId. Run `eas init` before creating the build.');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.post('/push-tokens', { token, locale: language, platform: Platform.OS });
  await saveRegisteredPushToken(token);
}

export function PushNotificationManager() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lastResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void api.patch('/notification-preferences', { locale: language }).catch((error) => {
      console.warn('Notification language synchronization failed:', error);
    });
    void registerDevice(language).catch((error) => {
      console.warn('Push notification registration failed:', error);
    });
  }, [language, user?.id]);

  useEffect(() => {
    if (!user) return undefined;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (lastResponseId.current === responseId) return;
      lastResponseId.current = responseId;
      openPushDestination(response.notification.request.content.data as PushData);
      void Notifications.clearLastNotificationResponseAsync();
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    return () => subscription.remove();
  }, [user?.id]);

  return null;
}
