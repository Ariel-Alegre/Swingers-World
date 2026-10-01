import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { UserAvatar } from '../components/UserAvatar';
import { ProfileCompletionModal } from '../components/ProfileCompletionModal';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors, radius, spacing } from '../theme/colors';
import type { Message } from '../types/api';
import type { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;
type DeliveryEvent = { receiverId: string; messageIds: string[]; deliveredAt: string };
type ReadEvent = { readerId: string; messageIds: string[]; readAt: string };

function mergeMessage(current: Message[], incoming: Message) {
  const existingIndex = current.findIndex((message) => message.id === incoming.id);
  if (existingIndex < 0) {
    return [...current, incoming].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }
  const next = [...current];
  next[existingIndex] = { ...next[existingIndex], ...incoming };
  return next;
}

export function ChatDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isFocused = useIsFocused();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState(route.params.initialMessage || '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markConversationRead = useCallback(async () => {
    if (!user || !isFocused) return;
    const readAt = new Date().toISOString();
    setMessages((current) => current.map((message) => (
      message.senderId === route.params.userId && !message.read
        ? { ...message, read: true, readAt, deliveredAt: message.deliveredAt || readAt }
        : message
    )));
    try {
      await api.post('/messages/read', { senderId: route.params.userId });
    } catch {
      // A later load or socket event will reconcile the persisted read state.
    }
  }, [isFocused, route.params.userId, user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<Message[]>('/messages', { params: { senderId: user.id, receiverId: route.params.userId } });
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      setMessages(sorted);
      setError('');
      await markConversationRead();
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
    }
  }, [markConversationRead, route.params.userId, user, t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let activeSocket: Socket | null = null;

    const joinRoom = () => activeSocket?.emit('joinRoom', { otherUserId: route.params.userId });
    const onReceiveMessage = (message: Message) => {
      const belongsToConversation = (
        (message.senderId === user.id && message.receiverId === route.params.userId)
        || (message.senderId === route.params.userId && message.receiverId === user.id)
      );
      if (!belongsToConversation) return;
      setMessages((current) => mergeMessage(current, message));
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      if (message.senderId === route.params.userId && isFocused) void markConversationRead();
    };
    const onDelivered = ({ receiverId, messageIds, deliveredAt }: DeliveryEvent) => {
      if (receiverId !== route.params.userId) return;
      const ids = new Set(messageIds);
      setMessages((current) => current.map((message) => ids.has(message.id) ? { ...message, deliveredAt } : message));
    };
    const onRead = ({ readerId, messageIds, readAt }: ReadEvent) => {
      if (readerId !== route.params.userId) return;
      const ids = new Set(messageIds);
      setMessages((current) => current.map((message) => ids.has(message.id)
        ? { ...message, read: true, readAt, deliveredAt: message.deliveredAt || readAt }
        : message));
    };
    const onTyping = ({ typingUserId }: { typingUserId: string }) => {
      if (typingUserId === route.params.userId) {
        setIsTyping(true);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    };
    const onStopTyping = ({ typingUserId }: { typingUserId: string }) => {
      if (typingUserId === route.params.userId) setIsTyping(false);
    };

    void getSocket().then((socket) => {
      if (!active) return;
      activeSocket = socket;
      socketRef.current = socket;
      joinRoom();
      socket.on('connect', joinRoom);
      socket.on('receiveMessage', onReceiveMessage);
      socket.on('messagesDelivered', onDelivered);
      socket.on('messagesRead', onRead);
      socket.on('typing', onTyping);
      socket.on('stopTyping', onStopTyping);
    }).catch(() => undefined);

    return () => {
      active = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (activeSocket) {
        activeSocket.emit('stopTyping', { otherUserId: route.params.userId });
        activeSocket.emit('leaveRoom', { otherUserId: route.params.userId });
        activeSocket.off('connect', joinRoom);
        activeSocket.off('receiveMessage', onReceiveMessage);
        activeSocket.off('messagesDelivered', onDelivered);
        activeSocket.off('messagesRead', onRead);
        activeSocket.off('typing', onTyping);
        activeSocket.off('stopTyping', onStopTyping);
      }
      socketRef.current = null;
    };
  }, [isFocused, markConversationRead, route.params.userId, user]);

  const stopTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    socketRef.current?.emit('stopTyping', { otherUserId: route.params.userId });
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      stopTyping();
      return;
    }
    socketRef.current?.emit('typing', { otherUserId: route.params.userId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 1200);
  };

  const send = async () => {
    if (user?.profileComplete === false) {
      setProfileGateOpen(true);
      return;
    }
    if (!user || !text.trim() || sending) return;
    const message = text.trim();
    setText('');
    stopTyping();
    setSending(true);
    try {
      const { data } = await api.post<Message>('/messages', { receiverId: route.params.userId, content: message });
      setMessages((current) => mergeMessage(current, data));
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (value) {
      setText(message);
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (value: string) => new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={route.params.name}
          onPress={() => navigation.navigate('Profile', { userId: route.params.userId })}
          style={styles.profileLink}
        >
          <UserAvatar uri={route.params.avatar} name={route.params.name} size={46} />
          <View>
            <Text style={styles.name}>{route.params.name}</Text>
            <Text style={styles.private}>{t('chat.private')}</Text>
          </View>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={isTyping ? (
            <View style={styles.typingBubble} accessibilityLabel={t('chat.typing')}>
              <Text style={styles.typingDots}>•••</Text>
            </View>
          ) : null}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            const statusLabel = item.read ? t('chat.read') : item.deliveredAt ? t('chat.delivered') : t('chat.sent');
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={styles.bubbleText}>{item.content || t('common.image')}</Text>
                <View style={styles.messageMeta}>
                  <Text style={styles.time}>{formatTime(item.sentAt)}</Text>
                  {mine ? (
                    <Ionicons
                      accessibilityLabel={statusLabel}
                      name={item.deliveredAt || item.read ? 'checkmark-done' : 'checkmark'}
                      size={16}
                      color={item.read ? '#59AFFF' : 'rgba(255,255,255,0.68)'}
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={handleTextChange}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus={Boolean(route.params.initialMessage)}
            multiline
            style={styles.input}
          />
          <Pressable onPress={() => void send()} disabled={!text.trim() || sending} style={styles.send}>
            {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" color={colors.white} size={21} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <ProfileCompletionModal
        visible={profileGateOpen}
        onClose={() => setProfileGateOpen(false)}
        onEditProfile={() => {
          setProfileGateOpen(false);
          navigation.navigate('EditProfile');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  profileLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  private: { color: colors.textMuted, fontSize: 12 },
  messages: { padding: spacing.md, gap: spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  typingBubble: { alignSelf: 'flex-start', minWidth: 58, height: 38, marginTop: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderBottomLeftRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  typingDots: { color: colors.textMuted, fontSize: 19, fontWeight: '900', letterSpacing: 3, lineHeight: 21 },
  bubble: { maxWidth: '80%', minWidth: 76, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 6, borderRadius: radius.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.white, lineHeight: 20 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  time: { color: 'rgba(255,255,255,0.62)', fontSize: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, maxHeight: 110, minHeight: 46, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  error: { color: colors.danger, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
