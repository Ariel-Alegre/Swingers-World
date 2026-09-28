import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Descubrir'>, NativeStackNavigationProp<RootStackParamList>>;

function ageFromDate(value?: string | null) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
}

export function DiscoverScreen({ navigation }: { navigation: Navigation }) {
  const [users, setUsers] = useState<User[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [liking, setLiking] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data } = await api.get<User[]>('/perfiles');
      setUsers(Array.isArray(data) ? data : []);
      setIndex(0);
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const user = users[index];

  const next = () => setIndex((current) => Math.min(current + 1, users.length));
  const like = async () => {
    if (!user || liking) return;
    setLiking(true);
    try {
      await api.post('/like', { likedUserId: user.id });
      next();
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLiking(false);
    }
  };

  if (loading) return <Screen contentStyle={styles.center}><ActivityIndicator size="large" color={colors.gold} /></Screen>;

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}>
      <Header title="Descubrir" subtitle="Personas que coinciden con tus preferencias" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!user ? (
        <EmptyState icon="sparkles-outline" title="Ya viste todos los perfiles" message="Deslizá hacia abajo para actualizar y descubrir nuevas personas." />
      ) : (
        <View style={styles.card}>
          <Pressable onPress={() => navigation.navigate('Profile', { userId: user.id })}>
            {user.Perfil?.visibilidad_foto && user.Perfil.fotos?.[0]?.url ? (
              <Image source={{ uri: user.Perfil.fotos[0].url }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.privatePhoto]}>
                <Ionicons name="lock-closed" size={42} color={colors.gold} />
                <Text style={styles.privateTitle}>Fotos privadas</Text>
                <Text style={styles.privateCopy}>Entrá al perfil para solicitar acceso</Text>
              </View>
            )}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user.Perfil?.nombre_visible || `${user.nombre} ${user.apellido}`}</Text>
                {ageFromDate(user.Perfil?.fecha_nacimiento) ? <Text style={styles.age}>{ageFromDate(user.Perfil?.fecha_nacimiento)}</Text> : null}
                {user.Perfil?.verificado ? <Ionicons name="checkmark-circle" size={21} color={colors.success} /> : null}
              </View>
              {user.Perfil?.direccion ? <Text style={styles.location}><Ionicons name="location-outline" /> {user.Perfil.direccion}</Text> : null}
              <Text style={styles.description} numberOfLines={3}>{user.Perfil?.descripcion || 'Prefiere conocerte antes de compartir más detalles.'}</Text>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Pressable onPress={next} style={[styles.action, styles.skip]}><Ionicons name="close" size={30} color={colors.textMuted} /></Pressable>
            <Pressable onPress={like} disabled={liking} style={[styles.action, styles.like]}>
              {liking ? <ActivityIndicator color={colors.white} /> : <Ionicons name="heart" size={28} color={colors.white} />}
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, marginBottom: spacing.md },
  card: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  photo: { width: '100%', aspectRatio: 0.83, backgroundColor: colors.surfaceRaised },
  privatePhoto: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  privateTitle: { color: colors.goldSoft, fontSize: 20, fontWeight: '900' },
  privateCopy: { color: colors.textMuted },
  info: { padding: spacing.lg, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, color: colors.text, fontSize: 25, fontWeight: '900' },
  age: { color: colors.goldSoft, fontSize: 22 },
  location: { color: colors.textMuted },
  description: { color: colors.text, lineHeight: 21 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingBottom: spacing.lg },
  action: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  skip: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  like: { backgroundColor: colors.primary },
});
