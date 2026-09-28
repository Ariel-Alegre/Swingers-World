import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Favoritos'>, NativeStackNavigationProp<RootStackParamList>>;

export function LikesScreen({ navigation }: { navigation: Navigation }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get<User[]>('/mis-likes');
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const remove = async (id: string) => {
    try {
      await api.delete(`/mis-likes/${id}`);
      setUsers((current) => current.filter((item) => item.id !== id));
    } catch (value) {
      setError(getErrorMessage(value));
    }
  };

  return (
    <Screen>
      <Header title="Favoritos" subtitle="Perfiles que guardaste" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}
          contentContainerStyle={!users.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="heart-outline" title="Todavía no guardaste perfiles" message="Cuando alguien te interese, tocá el corazón para encontrarlo aquí." />}
          renderItem={({ item }) => {
            const name = item.Perfil?.nombre_visible || `${item.nombre} ${item.apellido}`;
            const avatar = item.Perfil?.visibilidad_foto ? item.Perfil?.fotos?.[0]?.url : null;
            return (
              <Pressable onPress={() => navigation.navigate('Profile', { userId: item.id })} style={styles.row}>
                <UserAvatar uri={avatar} name={name} size={58} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{name}</Text>
                  <Text numberOfLines={1} style={styles.description}>{item.Perfil?.descripcion || 'Ver perfil'}</Text>
                </View>
                <Pressable onPress={() => void remove(item.id)} hitSlop={12}><Ionicons name="trash-outline" size={21} color={colors.danger} /></Pressable>
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
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
