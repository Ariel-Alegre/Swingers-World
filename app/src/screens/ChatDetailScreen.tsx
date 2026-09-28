import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { Message } from '../types/api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

export function ChatDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<Message[]>('/mensajes', { params: { emisorId: user.id, receptorId: route.params.userId } });
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      setMessages(sorted);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLoading(false);
    }
  }, [route.params.userId, user]);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!user || !text.trim() || sending) return;
    const message = text.trim();
    setText('');
    setSending(true);
    try {
      const { data } = await api.post<Message>('/mensaje', { emisorId: user.id, receptorId: route.params.userId, mensaje: message });
      setMessages((current) => [...current, data]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (value) {
      setText(message);
      setError(getErrorMessage(value));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <UserAvatar uri={route.params.avatar} name={route.params.name} size={46} />
        <View><Text style={styles.name}>{route.params.name}</Text><Text style={styles.online}>Conversación privada</Text></View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.emisorId === user?.id;
            return <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={styles.bubbleText}>{item.mensaje || 'Imagen'}</Text></View>;
          }}
        />
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Escribí un mensaje…" placeholderTextColor={colors.textMuted} multiline style={styles.input} />
          <Pressable onPress={() => void send()} disabled={!text.trim() || sending} style={styles.send}>
            {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" color={colors.white} size={21} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  online: { color: colors.textMuted, fontSize: 12 },
  messages: { padding: spacing.md, gap: spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: radius.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.white, lineHeight: 20 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, maxHeight: 110, minHeight: 46, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  error: { color: colors.danger, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
