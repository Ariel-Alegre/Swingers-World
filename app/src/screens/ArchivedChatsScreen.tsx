import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, getErrorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors, radius, spacing } from '../theme/colors';
import type { Conversation } from '../types/api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ArchivedChats'>;

export function ArchivedChatsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [processingParticipantId, setProcessingParticipantId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false, silent = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    try {
      const { data } = await api.get<Conversation[]>('/conversations', {
        params: { userId: user.id, archived: true },
      });
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    let active = true;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> | null = null;
    const refreshChats = () => void load(false, true);

    void getSocket().then((socket) => {
      if (!active) return;
      activeSocket = socket;
      socket.on('conversationArchived', refreshChats);
      socket.on('conversationUnarchived', refreshChats);
      socket.on('conversationDeleted', refreshChats);
      socket.on('unreadMessages', refreshChats);
      socket.on('messagesRead', refreshChats);
    }).catch(() => undefined);

    return () => {
      active = false;
      activeSocket?.off('conversationArchived', refreshChats);
      activeSocket?.off('conversationUnarchived', refreshChats);
      activeSocket?.off('conversationDeleted', refreshChats);
      activeSocket?.off('unreadMessages', refreshChats);
      activeSocket?.off('messagesRead', refreshChats);
    };
  }, [load]);

  const unarchive = async (conversation: Conversation) => {
    setSelectedConversation(null);
    setProcessingParticipantId(conversation.participantId);
    try {
      await api.patch(`/conversations/${conversation.participantId}/unarchive`);
      setItems((current) => current.filter((item) => item.participantId !== conversation.participantId));
      setError('');
    } catch (value) {
      Alert.alert(t('chats.actions'), getErrorMessage(value, t('chats.unarchiveFailed'), t));
    } finally {
      setProcessingParticipantId(null);
    }
  };

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

  return (
    <Screen>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.participantId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}
          contentContainerStyle={!items.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="archive-outline" title={t('chats.archivedTitle')} message={t('chats.archivedEmpty')} />}
          renderItem={({ item }) => {
            const name = `${item.firstName} ${item.lastName}`.trim();
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
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{name}</Text>
                    {(item.unreadCount || 0) > 0 ? <View style={styles.dot} /> : null}
                  </View>
                  <Text numberOfLines={1} style={[styles.message, (item.unreadCount || 0) > 0 && styles.unreadMessage]}>
                    {item.lastMessage || (item.lastMessageType === 'audio' ? t('chat.audio') : t('common.image'))}
                  </Text>
                </View>
                {processingParticipantId === item.participantId ? <ActivityIndicator size="small" color={colors.gold} /> : null}
              </Pressable>
            );
          }}
        />
      )}

      <Modal animationType="fade" transparent visible={Boolean(selectedConversation)} onRequestClose={() => setSelectedConversation(null)}>
        <View style={styles.modalOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setSelectedConversation(null)} style={styles.modalBackdrop} />
          {selectedConversation ? (
            <View style={styles.actionMenu}>
              <Text style={styles.actionTitle}>{t('chats.actions')}</Text>
              <Text numberOfLines={1} style={styles.actionName}>{`${selectedConversation.firstName} ${selectedConversation.lastName}`.trim()}</Text>
              <Pressable onPress={() => void unarchive(selectedConversation)} style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}>
                <View style={styles.actionIcon}><Ionicons name="arrow-up-circle-outline" size={23} color={colors.gold} /></View>
                <Text style={styles.actionText}>{t('chats.unarchive')}</Text>
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
