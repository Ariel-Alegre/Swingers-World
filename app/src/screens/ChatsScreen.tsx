import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { Conversation } from '../types/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Chats'>, NativeStackNavigationProp<RootStackParamList>>;

export function ChatsScreen({ navigation }: { navigation: Navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get<Conversation[]>('/conversaciones', { params: { userId: user.id } });
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen>
      <Header title="Mensajes" subtitle="Tus conversaciones privadas" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.interlocutorId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}
          contentContainerStyle={!items.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="Todavía no hay conversaciones" message="Abrí un perfil y enviá el primer mensaje." />}
          renderItem={({ item }) => {
            const name = `${item.nombre} ${item.apellido}`.trim();
            return (
              <Pressable onPress={() => navigation.navigate('ChatDetail', { userId: item.interlocutorId, name, avatar: item.avatar })} style={styles.row}>
                <UserAvatar uri={item.avatar} name={name} size={58} />
                <View style={styles.copy}>
                  <View style={styles.nameRow}><Text style={styles.name}>{name}</Text>{item.ultimoMensajeDeOtro && !item.leido ? <View style={styles.dot} /> : null}</View>
                  <Text numberOfLines={1} style={styles.message}>{item.ultimoMensaje || 'Imagen'}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  copy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  message: { color: colors.textMuted, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  error: { color: colors.danger, marginBottom: spacing.md },
});
