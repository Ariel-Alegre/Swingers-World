import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { TabHeaderActions } from '../components/TabHeaderActions';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { AppButton } from '../components/AppButton';
import { api, getErrorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors, radius, spacing } from '../theme/colors';
import type { PhotoRequest } from '../types/api';
import { useLanguage } from '../context/LanguageContext';

export function RequestsScreen() {
  const { t } = useLanguage();
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
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    let active = true;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> | null = null;

    const handleRequestsChanged = () => {
      if (active) void load(true);
    };

    void getSocket().then((socket) => {
      if (!active) return;
      activeSocket = socket;
      socket.on('photoRequestsChanged', handleRequestsChanged);
    }).catch(() => undefined);

    return () => {
      active = false;
      activeSocket?.off('photoRequestsChanged', handleRequestsChanged);
    };
  }, [load]);

  const respond = async (request: PhotoRequest, decision: 'accepted' | 'rejected') => {
    setBusyId(request.id);
    try {
      await api.put(`/photo-requests/${request.id}`, { decision, durationHours: decision === 'accepted' ? 24 : undefined });
      setRequests((current) => current.filter((item) => item.id !== request.id));
      Alert.alert(decision === 'accepted' ? t('requests.acceptedTitle') : t('requests.rejectedTitle'), decision === 'accepted' ? t('requests.acceptedMessage') : t('requests.rejectedMessage'));
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setBusyId('');
    }
  };

  return (
    <Screen>
      <Header title={t('requests.title')} subtitle={t('requests.subtitle')} action={<TabHeaderActions />} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={requests.filter((item) => item.status === 'pending')}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} />}
          contentContainerStyle={!requests.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title={t('requests.emptyTitle')} message={t('requests.emptyMessage')} />}
          renderItem={({ item }) => {
            const person = item.requester;
            const name = person?.Profile?.displayName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || t('common.member');
            const avatar = person?.Profile?.photosVisible ? person.Profile.photos?.[0]?.url : null;
            return (
              <View style={styles.card}>
                <View style={styles.person}>
                  <UserAvatar uri={avatar} name={name} />
                  <View><Text style={styles.name}>{name}</Text><Text style={styles.copy}>{t('requests.wantsAccess')}</Text></View>
                </View>
                <View style={styles.actions}>
                  <AppButton title={t('requests.reject')} variant="secondary" onPress={() => void respond(item, 'rejected')} disabled={busyId === item.id} style={styles.button} />
                  <AppButton title={t('requests.accept')} onPress={() => void respond(item, 'accepted')} loading={busyId === item.id} style={styles.button} />
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
