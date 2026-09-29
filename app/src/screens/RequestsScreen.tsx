import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { AppButton } from '../components/AppButton';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { PhotoRequest } from '../types/api';

export function RequestsScreen() {
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get<PhotoRequest[]>('/photo-requests');
      setRequests(Array.isArray(data) ? data : []);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const respond = async (request: PhotoRequest, decision: 'accepted' | 'rejected') => {
    setBusyId(request.id);
    try {
      await api.put(`/photo-requests/${request.id}`, { decision, durationHours: decision === 'accepted' ? 24 : undefined });
      setRequests((current) => current.filter((item) => item.id !== request.id));
      Alert.alert(decision === 'accepted' ? 'Acceso concedido' : 'Solicitud rechazada', decision === 'accepted' ? 'Podrá ver tus fotos privadas durante 24 horas.' : 'La solicitud fue eliminada.');
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setBusyId('');
    }
  };

  return (
    <Screen>
      <Header title="Solicitudes" subtitle="Vos decidís quién ve tus fotos" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={requests.filter((item) => item.status === 'pending')}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}
          contentContainerStyle={!requests.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No hay solicitudes pendientes" message="Las nuevas solicitudes para ver tus fotos aparecerán aquí." />}
          renderItem={({ item }) => {
            const person = item.requester;
            const name = person?.Profile?.displayName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Miembro';
            const avatar = person?.Profile?.photosVisible ? person.Profile.photos?.[0]?.url : null;
            return (
              <View style={styles.card}>
                <View style={styles.person}>
                  <UserAvatar uri={avatar} name={name} />
                  <View><Text style={styles.name}>{name}</Text><Text style={styles.copy}>Quiere ver tus fotos privadas</Text></View>
                </View>
                <View style={styles.actions}>
                  <AppButton title="Rechazar" variant="secondary" onPress={() => void respond(item, 'rejected')} disabled={busyId === item.id} style={styles.button} />
                  <AppButton title="Aceptar 24 h" onPress={() => void respond(item, 'accepted')} loading={busyId === item.id} style={styles.button} />
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  card: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  copy: { color: colors.textMuted, marginTop: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
