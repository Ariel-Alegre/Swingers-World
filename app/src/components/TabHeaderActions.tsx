import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { AppNotification } from '../types/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';
import { getSocket } from '../lib/socket';

type OpenPanel = 'notifications' | 'menu' | null;
type AnchorPosition = { top: number; right: number };

export function TabHeaderActions() {
  const navigation = useNavigation<NavigationProp<RootStackParamList & MainTabParamList>>();
  const { t, language } = useLanguage();
  const { width } = useWindowDimensions();
  const notificationAnchor = useRef<View>(null);
  const menuAnchor = useRef<View>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition>({ top: 92, right: spacing.md });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // The rest of the tab remains usable when notifications are unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadNotifications(); }, [loadNotifications]));

  useEffect(() => {
    let active = true;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    const receiveNotification = (notification: AppNotification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 50));
    };
    void getSocket().then((connectedSocket) => {
      if (!active) return;
      socket = connectedSocket;
      socket.on('notificationCreated', receiveNotification);
    }).catch(() => undefined);
    return () => {
      active = false;
      socket?.off('notificationCreated', receiveNotification);
    };
  }, []);

  const close = () => setOpenPanel(null);
  const showPanel = (panel: Exclude<OpenPanel, null>, anchor: React.RefObject<View | null>) => {
    if (openPanel === panel) {
      close();
      return;
    }
    setOpenPanel(panel);
    anchor.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchorPosition({
        top: y + measuredHeight + spacing.sm,
        right: Math.max(spacing.md, width - x - measuredWidth),
      });
    });
  };

  const navigate = (route: 'InterestedProfiles' | 'ReceivedLikes' | 'SentPhotoRequests' | 'Solicitudes' | 'BlockedUsers' | 'EditProfile') => {
    close();
    navigation.navigate(route);
  };

  const openNotification = (notification: AppNotification) => {
    close();
    if (!notification.read) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      void api.patch(`/notifications/${notification.id}/read`).catch(() => void loadNotifications());
    }
    if (notification.type === 'profile_incomplete') navigate('EditProfile');
    else if (notification.type === 'photo_request') navigate('Solicitudes');
    else if (notification.type === 'like_received') navigate('ReceivedLikes');
    else if (notification.relatedId) navigation.navigate('Profile', { userId: notification.relatedId });
    else navigate('SentPhotoRequests');
  };

  const formatNotificationDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const hasUnreadNotifications = notifications.some((notification) => !notification.read);
  const notificationWidth = Math.min(320, width - spacing.md * 2);

  return (
    <>
      <View pointerEvents="box-none" style={styles.actions}>
        <View ref={notificationAnchor} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notifications.open')}
            accessibilityState={{ expanded: openPanel === 'notifications' }}
            onPress={() => showPanel('notifications', notificationAnchor)}
            style={styles.button}
          >
            <Ionicons name={openPanel === 'notifications' ? 'notifications' : 'notifications-outline'} size={24} color={colors.gold} />
            {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>
        <View ref={menuAnchor} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discover.menu')}
            accessibilityState={{ expanded: openPanel === 'menu' }}
            onPress={() => showPanel('menu', menuAnchor)}
            style={styles.button}
          >
            <Ionicons name={openPanel === 'menu' ? 'close' : 'menu'} size={26} color={colors.gold} />
          </Pressable>
        </View>
      </View>

      <Modal animationType="fade" transparent statusBarTranslucent visible={Boolean(openPanel)} onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={close} style={styles.backdrop} />
          {openPanel === 'notifications' ? (
            <View style={[styles.dropdown, styles.notificationDropdown, { top: anchorPosition.top, right: anchorPosition.right, width: notificationWidth }]}>
              <Text style={styles.notificationTitle}>{t('notifications.title')}</Text>
              <View style={styles.divider} />
              {loading ? (
                <ActivityIndicator color={colors.gold} style={styles.loader} />
              ) : notifications.length ? (
                <ScrollView style={styles.notificationList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {notifications.map((notification, index) => {
                    const isProfileReminder = notification.type === 'profile_incomplete';
                    const fallbackKey = isProfileReminder
                      ? 'notifications.profileIncomplete'
                      : notification.type === 'photo_request'
                        ? 'notifications.photoRequest'
                        : notification.type === 'photo_request_rejected'
                          ? 'notifications.photoRejected'
                          : notification.type === 'photo_request_pending'
                            ? 'notifications.photoPending'
                            : notification.type === 'like_received'
                              ? 'notifications.likeReceived'
                              : 'notifications.photoAccepted';
                    const icon = isProfileReminder
                      ? 'create-outline'
                      : notification.type === 'photo_request'
                        ? 'key-outline'
                        : notification.type === 'like_received'
                          ? 'heart-outline'
                          : notification.type === 'photo_request_rejected'
                            ? 'close-circle-outline'
                            : 'checkmark-circle-outline';
                    return (
                      <React.Fragment key={notification.id}>
                        {index ? <View style={styles.divider} /> : null}
                        <Pressable onPress={() => openNotification(notification)} style={[styles.notificationItem, !notification.read && styles.notificationUnread]}>
                          <Ionicons
                            name={icon}
                            size={21}
                            color={isProfileReminder ? colors.primary : notification.type === 'photo_request' ? colors.gold : colors.success}
                          />
                          <View style={styles.notificationCopy}>
                            <Text style={[styles.notificationText, !notification.read && styles.notificationTextUnread]}>
                              {isProfileReminder ? t(fallbackKey) : notification.description || t(fallbackKey)}
                            </Text>
                            <Text style={styles.notificationDate}>{formatNotificationDate(notification.createdAt)}</Text>
                          </View>
                          {!notification.read ? <View style={styles.itemDot} /> : null}
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                </ScrollView>
              ) : <Text style={styles.empty}>{t('notifications.empty')}</Text>}
            </View>
          ) : null}

          {openPanel === 'menu' ? (
            <View style={[styles.dropdown, styles.menuDropdown, { top: anchorPosition.top, right: anchorPosition.right }]}>
              <MenuItem icon="heart" color={colors.primary} label={t('discover.menuFavorites')} onPress={() => navigate('InterestedProfiles')} />
              <View style={styles.divider} />
              <MenuItem icon="heart-circle-outline" label={t('discover.menuReceivedLikes')} onPress={() => navigate('ReceivedLikes')} />
              <View style={styles.divider} />
              <MenuItem icon="paper-plane-outline" label={t('discover.menuSentRequests')} onPress={() => navigate('SentPhotoRequests')} />
              <View style={styles.divider} />
              <MenuItem icon="key-outline" label={t('discover.menuReceivedRequests')} onPress={() => navigate('Solicitudes')} />
              <View style={styles.divider} />
              <MenuItem icon="ban-outline" color={colors.danger} label={t('discover.menuBlockedUsers')} onPress={() => navigate('BlockedUsers')} />
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

function MenuItem({ icon, color = colors.gold, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; color?: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.menuItemText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  notificationDot: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF304F', borderWidth: 1.5, borderColor: colors.surface },
  overlay: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.05)' },
  dropdown: { position: 'absolute', borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', elevation: 14, shadowColor: colors.black, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  notificationDropdown: { maxHeight: 430 },
  notificationTitle: { color: colors.text, fontSize: 16, fontWeight: '900', paddingHorizontal: spacing.md, paddingVertical: 13 },
  loader: { padding: spacing.lg },
  notificationList: { maxHeight: 340 },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  notificationUnread: { backgroundColor: 'rgba(245,40,135,0.10)' },
  notificationCopy: { flex: 1 },
  notificationText: { color: colors.text, fontSize: 14, lineHeight: 19 },
  notificationTextUnread: { fontWeight: '900' },
  notificationDate: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  itemDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: colors.primary },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  menuDropdown: { width: 230, paddingVertical: spacing.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 13 },
  menuItemText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  pressed: { opacity: 0.62 },
});
