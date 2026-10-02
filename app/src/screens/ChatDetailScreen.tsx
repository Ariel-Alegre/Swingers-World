import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenCapture from 'expo-screen-capture';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
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
type SelectedImage = { uri: string; name: string; type: string };
type PreviewImage = { messageId: string; uri: string; viewOnce: boolean; consumed: boolean };
const MAX_RECORDING_MS = 5 * 60 * 1000;

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function AudioMessage({ uri, durationMs = 0 }: { uri: string; durationMs?: number | null }) {
  const player = useAudioPlayer({ uri }, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const totalSeconds = status.duration || Math.max(0, Number(durationMs) / 1000);
  const currentSeconds = Math.min(status.currentTime || 0, totalSeconds || 0);
  const progress = totalSeconds > 0 ? Math.min(1, currentSeconds / totalSeconds) : 0;

  useEffect(() => {
    player.muted = false;
    player.volume = 1;
  }, [player]);

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
    await setIsAudioActiveAsync(true);
    player.muted = false;
    player.volume = 1;
    if (totalSeconds > 0 && currentSeconds >= totalSeconds - 0.2) await player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.audioMessage}>
      <Pressable accessibilityRole="button" onPress={() => void togglePlayback()} disabled={!status.isLoaded} style={[styles.audioPlayButton, !status.isLoaded && styles.audioPlayButtonDisabled]}>
        {status.isLoaded
          ? <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color={colors.white} />
          : <ActivityIndicator size="small" color={colors.white} />}
      </Pressable>
      <View style={styles.audioDetails}>
        <View style={styles.audioTrack}>
          <View style={[styles.audioProgress, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.audioDuration}>
          {formatDuration((status.playing ? currentSeconds * 1000 : totalSeconds * 1000) || Number(durationMs) || 0)}
        </Text>
      </View>
      <Ionicons name="mic" size={17} color={colors.goldSoft} />
    </View>
  );
}

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
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [imageViewOnce, setImageViewOnce] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [localAudioUris, setLocalAudioUris] = useState<Record<string, string>>({});
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingActionRef = useRef(false);
  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'cache' });
  const recorderState = useAudioRecorderState(audioRecorder, 200);

  useEffect(() => {
    if (!isFocused) return undefined;
    const protectionKey = 'chat-detail';
    void ScreenCapture.preventScreenCaptureAsync(protectionKey).catch(() => undefined);
    if (Platform.OS === 'ios') {
      void ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => undefined);
    }

    return () => {
      void ScreenCapture.allowScreenCaptureAsync(protectionKey).catch(() => undefined);
      if (Platform.OS === 'ios') {
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
      }
    };
  }, [isFocused]);

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
    const onMessageViewed = ({ messageId }: { messageId: string }) => {
      setMessages((current) => current.map((message) => message.id === messageId
        ? { ...message, viewed: true, imageUrl: null }
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
      socket.on('messageViewed', onMessageViewed);
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
        activeSocket.off('messageViewed', onMessageViewed);
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

  const requireCompleteProfile = () => {
    if (user?.profileComplete === false) {
      setProfileGateOpen(true);
      return false;
    }
    return true;
  };

  const appendReceivedMessage = (message: Message) => {
    setMessages((current) => mergeMessage(current, message));
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const consumeViewOnceImage = async (image: PreviewImage) => {
    if (!image.viewOnce || image.consumed) return;
    setPreviewImage((current) => current?.messageId === image.messageId ? { ...current, consumed: true } : current);
    setMessages((current) => current.map((message) => message.id === image.messageId
      ? { ...message, viewed: true, imageUrl: null }
      : message));
    try {
      await api.post('/messages/image-viewed', { messageId: image.messageId });
    } catch (value) {
      setError(getErrorMessage(value, t('chat.viewOnceFailed'), t));
    }
  };

  const chooseImage = async () => {
    if (!requireCompleteProfile() || sending || recorderState.isRecording) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('chat.chooseImage'), t('chat.photoPermissionMessage'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.82,
        allowsEditing: false,
      });
      const asset = !result.canceled ? result.assets[0] : null;
      if (!asset) return;
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName || `chat-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      setImageViewOnce(false);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value, t('chat.mediaFailed'), t));
    }
  };

  const sendMedia = async (media: SelectedImage, durationMs?: number, viewOnce = false): Promise<Message | null> => {
    if (!user || sending) return null;
    const form = new FormData();
    form.append('receiverId', route.params.userId);
    if (text.trim() && media.type.startsWith('image/')) form.append('content', text.trim());
    if (durationMs !== undefined) form.append('audioDurationMs', String(durationMs));
    if (media.type.startsWith('image/')) form.append('viewOnce', String(viewOnce));
    form.append('media', media as unknown as Blob);

    setSending(true);
    stopTyping();
    try {
      const { data } = await api.post<Message>('/messages', form);
      appendReceivedMessage(data);
      if (media.type.startsWith('image/')) {
        setSelectedImage(null);
        setImageViewOnce(false);
        setText('');
      }
      setError('');
      return data;
    } catch (value) {
      setError(getErrorMessage(value, t('chat.mediaFailed'), t));
      return null;
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!requireCompleteProfile() || sending || selectedImage) return;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('chat.microphonePermissionTitle'), t('chat.microphonePermissionMessage'));
        return;
      }
      stopTyping();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      recordingActionRef.current = false;
      audioRecorder.record();
      setError('');
    } catch (value) {
      setError(getErrorMessage(value, t('chat.mediaFailed'), t));
    }
  };

  const cancelRecording = async () => {
    if (recordingActionRef.current) return;
    recordingActionRef.current = true;
    try {
      if (recorderState.isRecording) await audioRecorder.stop();
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      recordingActionRef.current = false;
    }
  };

  const sendRecording = async () => {
    if (!recorderState.isRecording || sending || recordingActionRef.current) return;
    recordingActionRef.current = true;
    const durationMs = recorderState.durationMillis;
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = audioRecorder.uri || recorderState.url;
      if (!uri || durationMs < 500) return;
      const sentMessage = await sendMedia({
        uri,
        name: `voice-${Date.now()}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`,
        type: Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
      }, durationMs);
      if (sentMessage?.id) {
        setLocalAudioUris((current) => ({ ...current, [sentMessage.id]: uri }));
      }
    } catch (value) {
      setError(getErrorMessage(value, t('chat.mediaFailed'), t));
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    } finally {
      recordingActionRef.current = false;
    }
  };

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis >= MAX_RECORDING_MS) {
      void sendRecording();
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);

  const send = async () => {
    if (!requireCompleteProfile() || !user || sending) return;
    if (selectedImage) {
      await sendMedia(selectedImage, undefined, imageViewOnce);
      return;
    }
    if (!text.trim()) return;
    const message = text.trim();
    setText('');
    stopTyping();
    setSending(true);
    try {
      const { data } = await api.post<Message>('/messages', { receiverId: route.params.userId, content: message });
      appendReceivedMessage(data);
      setError('');
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
              <View style={[styles.bubble, (item.imageUrl || item.audioUrl || item.viewOnce) && styles.mediaBubble, mine ? styles.mine : styles.theirs]}>
                {item.viewOnce ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={mine || item.viewed || !item.imageUrl}
                    onPress={() => item.imageUrl && setPreviewImage({ messageId: item.id, uri: item.imageUrl, viewOnce: true, consumed: false })}
                    style={styles.viewOnceButton}
                  >
                    <View style={styles.viewOnceIcon}><Text style={styles.viewOnceNumber}>1</Text></View>
                    <View style={styles.viewOnceCopy}>
                      <Text style={styles.viewOnceTitle}>{item.viewed ? t('chat.opened') : t('chat.viewOncePhoto')}</Text>
                      <Text style={styles.viewOnceHint}>{item.viewed ? t('chat.noLongerAvailable') : mine ? t('chat.viewOnceSent') : t('chat.tapToView')}</Text>
                    </View>
                  </Pressable>
                ) : item.imageUrl ? (
                  <Pressable accessibilityRole="imagebutton" onPress={() => setPreviewImage({ messageId: item.id, uri: item.imageUrl || '', viewOnce: false, consumed: false })}>
                    <Image source={{ uri: item.imageUrl }} style={styles.messageImage} resizeMode="cover" />
                  </Pressable>
                ) : null}
                {item.audioUrl ? <AudioMessage uri={localAudioUris[item.id] || item.audioUrl} durationMs={item.audioDurationMs} /> : null}
                {item.content ? <Text style={[styles.bubbleText, (item.imageUrl || item.audioUrl) && styles.mediaCaption]}>{item.content}</Text> : null}
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
        {recorderState.isRecording ? (
          <View style={styles.recordingComposer}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('chat.cancelRecording')} onPress={() => void cancelRecording()} style={styles.composerIconButton}>
              <Ionicons name="trash-outline" color={colors.danger} size={23} />
            </Pressable>
            <View style={styles.recordingStatus}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>{t('chat.recording')}</Text>
              <Text style={styles.recordingTime}>{formatDuration(recorderState.durationMillis)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('chat.sendAudio')} onPress={() => void sendRecording()} disabled={sending} style={styles.send}>
              {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" color={colors.white} size={21} />}
            </Pressable>
          </View>
        ) : (
          <View style={styles.composerContainer}>
            {selectedImage ? (
              <View style={styles.attachmentPreview}>
                <Image source={{ uri: selectedImage.uri }} style={styles.attachmentImage} />
                <View style={styles.attachmentDetails}>
                  <Text numberOfLines={1} style={styles.attachmentLabel}>{t('chat.imagePreview')}</Text>
                  <View style={styles.imageModeSelector}>
                    <Pressable onPress={() => setImageViewOnce(false)} style={[styles.imageModeOption, !imageViewOnce && styles.imageModeOptionActive]}>
                      <Ionicons name="image-outline" size={15} color={!imageViewOnce ? colors.background : colors.textMuted} />
                      <Text style={[styles.imageModeText, !imageViewOnce && styles.imageModeTextActive]}>{t('chat.normalPhoto')}</Text>
                    </Pressable>
                    <Pressable onPress={() => setImageViewOnce(true)} style={[styles.imageModeOption, imageViewOnce && styles.imageModeOptionActive]}>
                      <Ionicons name="eye-outline" size={15} color={imageViewOnce ? colors.background : colors.textMuted} />
                      <Text style={[styles.imageModeText, imageViewOnce && styles.imageModeTextActive]}>{t('chat.viewOnce')}</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t('chat.removeAttachment')} onPress={() => { setSelectedImage(null); setImageViewOnce(false); }} style={styles.removeAttachment}>
                  <Ionicons name="close" size={19} color={colors.white} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composer}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('chat.chooseImage')} onPress={() => void chooseImage()} disabled={sending} style={styles.composerIconButton}>
                <Ionicons name="image-outline" color={colors.gold} size={24} />
              </Pressable>
              <TextInput
                value={text}
                onChangeText={handleTextChange}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={colors.textMuted}
                autoFocus={Boolean(route.params.initialMessage)}
                multiline
                style={styles.input}
              />
              {sending ? (
                <View style={styles.send}><ActivityIndicator color={colors.white} /></View>
              ) : text.trim() || selectedImage ? (
                <Pressable onPress={() => void send()} style={styles.send}>
                  <Ionicons name="send" color={colors.white} size={21} />
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={t('chat.record')} onPress={() => void startRecording()} disabled={sending} style={styles.micButton}>
                  <Ionicons name="mic" color={colors.white} size={22} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
      <Modal visible={Boolean(previewImage)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.imageViewer}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setPreviewImage(null)} style={styles.imageViewerClose}>
            <Ionicons name="close" color={colors.white} size={28} />
          </Pressable>
          {previewImage ? (
            <Image
              source={{ uri: previewImage.uri }}
              resizeMode="contain"
              style={styles.fullImage}
              onLoad={() => void consumeViewOnceImage(previewImage)}
            />
          ) : null}
        </View>
      </Modal>
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
  mediaBubble: { width: 260, maxWidth: '82%', paddingHorizontal: 6, paddingTop: 6 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.white, lineHeight: 20 },
  mediaCaption: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  messageImage: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.surface },
  viewOnceButton: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  viewOnceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.goldSoft },
  viewOnceNumber: { color: colors.goldSoft, fontSize: 17, fontWeight: '900' },
  viewOnceCopy: { flex: 1 },
  viewOnceTitle: { color: colors.white, fontWeight: '800' },
  viewOnceHint: { color: 'rgba(255,255,255,0.68)', fontSize: 11, marginTop: 2 },
  audioMessage: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  audioPlayButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  audioPlayButtonDisabled: { opacity: 0.65 },
  audioDetails: { flex: 1, gap: 5 },
  audioTrack: { height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  audioProgress: { height: 4, borderRadius: 2, backgroundColor: colors.goldSoft },
  audioDuration: { color: 'rgba(255,255,255,0.72)', fontSize: 11 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  time: { color: 'rgba(255,255,255,0.62)', fontSize: 10 },
  composerContainer: { backgroundColor: colors.background },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  composerIconButton: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 110, minHeight: 46, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  micButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  attachmentPreview: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  attachmentImage: { width: 52, height: 52, borderRadius: radius.sm },
  attachmentDetails: { flex: 1, gap: 7 },
  attachmentLabel: { color: colors.text, fontWeight: '700' },
  imageModeSelector: { flexDirection: 'row', alignSelf: 'flex-start', padding: 2, borderRadius: radius.sm, backgroundColor: colors.surface },
  imageModeOption: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: radius.sm },
  imageModeOptionActive: { backgroundColor: colors.goldSoft },
  imageModeText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  imageModeTextActive: { color: colors.background },
  removeAttachment: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger },
  recordingComposer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  recordingStatus: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recordingText: { flex: 1, color: colors.text, fontWeight: '700' },
  recordingTime: { color: colors.danger, fontVariant: ['tabular-nums'], fontWeight: '800' },
  imageViewer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.96)' },
  imageViewerClose: { position: 'absolute', zIndex: 2, top: 52, right: spacing.lg, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  fullImage: { width: '100%', height: '100%' },
  error: { color: colors.danger, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
