import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors, radius, spacing } from '../theme/colors';
import type { Conversation } from '../types/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Chats'>, NativeStackNavigationProp<RootStackParamList>>;

export function ChatsScreen({ navigation }: { navigation: Navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [processingParticipantId, setProcessingParticipantId] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(() => new Set());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const load = useCallback(async (refresh = false, silent = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    try {
      const { data } = await api.get<Conversation[]>('/conversations', { params: { userId: user.id } });
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmDelete = (conversation: Conversation, name: string) => {
    setSelectedConversation(null);
    Alert.alert(
      t('chats.deleteTitle'),
      t('chats.deleteMessage', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chats.deleteConfirm'),
          style: 'destructive',
          onPress: () => void (async () => {
            setProcessingParticipantId(conversation.participantId);
            try {
              await api.delete(`/conversations/${conversation.participantId}`);
              setItems((current) => current.filter((item) => item.participantId !== conversation.participantId));
              setError('');
            } catch (value) {
              Alert.alert(t('chats.deleteTitle'), getErrorMessage(value, t('chats.deleteFailed'), t));
            } finally {
              setProcessingParticipantId(null);
            }
          })(),
        },
      ],
    );
  };

  const archiveConversation = async (conversation: Conversation) => {
    setSelectedConversation(null);
    setProcessingParticipantId(conversation.participantId);
    try {
      await api.patch(`/conversations/${conversation.participantId}/archive`);
      setItems((current) => current.filter((item) => item.participantId !== conversation.participantId));
      setError('');
    } catch (value) {
      Alert.alert(t('chats.actions'), getErrorMessage(value, t('chats.archiveFailed'), t));
    } finally {
      setProcessingParticipantId(null);
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> | null = null;

    const clearTyping = (typingUserId: string) => {
      const timer = typingTimers.current.get(typingUserId);
      if (timer) clearTimeout(timer);
      typingTimers.current.delete(typingUserId);
      setTypingUserIds((current) => {
        const next = new Set(current);
        next.delete(typingUserId);
        return next;
      });
    };
    const showTyping = ({ typingUserId }: { typingUserId: string }) => {
      setTypingUserIds((current) => new Set(current).add(typingUserId));
      const currentTimer = typingTimers.current.get(typingUserId);
      if (currentTimer) clearTimeout(currentTimer);
      typingTimers.current.set(typingUserId, setTimeout(() => clearTyping(typingUserId), 2200));
    };
    const stopTyping = ({ typingUserId }: { typingUserId: string }) => clearTyping(typingUserId);
    const refreshConversations = () => void load(false, true);
    const removeConversation = ({ participantId }: { participantId: string }) => {
      setItems((current) => current.filter((item) => item.participantId !== participantId));
    };

    void getSocket().then((socket) => {
      if (!active) return;
      activeSocket = socket;
      socket.on('conversationTyping', showTyping);
      socket.on('conversationStopTyping', stopTyping);
      socket.on('unreadMessages', refreshConversations);
      socket.on('messagesRead', refreshConversations);
      socket.on('conversationDeleted', removeConversation);
      socket.on('conversationArchived', removeConversation);
    }).catch(() => undefined);

    return () => {
      active = false;
      activeSocket?.off('conversationTyping', showTyping);
      activeSocket?.off('conversationStopTyping', stopTyping);
      activeSocket?.off('unreadMessages', refreshConversations);
      activeSocket?.off('messagesRead', refreshConversations);
      activeSocket?.off('conversationDeleted', removeConversation);
      activeSocket?.off('conversationArchived', removeConversation);
      typingTimers.current.forEach((timer) => clearTimeout(timer));
      typingTimers.current.clear();
    };
  }, [load, user]);

  return (
    <Screen>
      <Header title={t('chats.title')} subtitle={t('chats.subtitle')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.participantId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}
          contentContainerStyle={!items.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title={t('chats.emptyTitle')} message={t('chats.emptyMessage')} />}
          renderItem={({ item }) => {
            const name = `${item.firstName} ${item.lastName}`.trim();
            const typing = typingUserIds.has(item.participantId);
            return (
              <Pressable
                disabled={processingParticipantId === item.participantId}
                delayLongPress={450}
                onPress={() => navigation.navigate('ChatDetail', { userId: item.participantId, name, avatar: item.avatar })}
                onLongPress={() => setSelectedConversation(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed, processingParticipantId === item.participantId && styles.rowProcessing]}
              >
                <UserAvatar uri={item.avatar} name={name} size={58} />
                <View style={styles.copy}>
                  <View style={styles.nameRow}><Text style={styles.name}>{name}</Text>{(item.unreadCount || 0) > 0 ? <View style={styles.dot} /> : null}</View>
                  <Text numberOfLines={1} style={[styles.message, (item.unreadCount || 0) > 0 && styles.unreadMessage, typing && styles.typing]}>{typing ? t('chat.typing') : item.lastMessage || t('common.image')}</Text>
                </View>
                {processingParticipantId === item.participantId ? <ActivityIndicator size="small" color={colors.gold} /> : null}
              </Pressable>
            );
          }}
        />
      )}
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedConversation)}
        onRequestClose={() => setSelectedConversation(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setSelectedConversation(null)} style={styles.modalBackdrop} />
          {selectedConversation ? (
            <View style={styles.actionMenu}>
              <Text style={styles.actionTitle}>{t('chats.actions')}</Text>
              <Text numberOfLines={1} style={styles.actionName}>{`${selectedConversation.firstName} ${selectedConversation.lastName}`.trim()}</Text>
              <Pressable onPress={() => void archiveConversation(selectedConversation)} style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}>
                <View style={styles.actionIcon}><Ionicons name="archive-outline" size={22} color={colors.gold} /></View>
                <Text style={styles.actionText}>{t('chats.archive')}</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(selectedConversation, `${selectedConversation.firstName} ${selectedConversation.lastName}`.trim())} style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}>
                <View style={[styles.actionIcon, styles.dangerIcon]}><Ionicons name="trash-outline" size={22} color={colors.danger} /></View>
                <Text style={[styles.actionText, styles.dangerText]}>{t('chats.delete')}</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedConversation(null)} style={({ pressed }) => [styles.cancelAction, pressed && styles.actionPressed]}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowPressed: { backgroundColor: colors.surfaceRaised, borderColor: colors.gold },
  rowProcessing: { opacity: 0.55 },
  copy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  message: { color: colors.textMuted, marginTop: 4 },
  unreadMessage: { color: colors.text, fontWeight: '800' },
  typing: { color: colors.success, fontWeight: '700' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  error: { color: colors.danger, marginBottom: spacing.md },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, paddingBottom: spacing.xl, backgroundColor: 'rgba(0, 0, 0, 0.68)' },
  modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  actionMenu: { borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  actionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  actionName: { color: colors.textMuted, marginTop: 3, marginBottom: spacing.md },
  actionRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actionPressed: { opacity: 0.62 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(234, 183, 106, 0.10)' },
  dangerIcon: { backgroundColor: 'rgba(181, 35, 53, 0.10)' },
  actionText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  dangerText: { color: colors.danger },
  cancelAction: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '800' },
});
