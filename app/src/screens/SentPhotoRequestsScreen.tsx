import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { PhotoRequest } from '../types/api';
import type { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SentPhotoRequests'>;

export function SentPhotoRequestsScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get<PhotoRequest[]>('/photo-requests/sent');
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

  const statusLabel = (request: PhotoRequest) => {
    if (request.status === 'accepted' && request.permissionExpiresAt && new Date(request.permissionExpiresAt).getTime() <= Date.now()) {
      return t('sentRequests.expired');
    }
    return request.status === 'accepted' ? t('sentRequests.accepted') : t('sentRequests.pending');
  };

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('sentRequests.subtitle')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} colors={[colors.gold]} />}
          contentContainerStyle={!requests.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="images-outline" title={t('sentRequests.emptyTitle')} message={t('sentRequests.emptyMessage')} />}
          renderItem={({ item }) => {
            const person = item.targetUser;
            const name = person?.Profile?.displayName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || t('common.member');
            const avatar = person?.Profile?.photosVisible ? person.Profile.photos?.[0]?.url : null;
            const accepted = item.status === 'accepted' && (!item.permissionExpiresAt || new Date(item.permissionExpiresAt).getTime() > Date.now());

            return (
              <Pressable disabled={!person} onPress={() => person && navigation.navigate('Profile', { userId: person.id })} style={styles.row}>
                <UserAvatar uri={avatar} name={name} size={58} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={[styles.status, accepted ? styles.accepted : styles.pending]}>{statusLabel(item)}</Text>
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
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  copy: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  status: { alignSelf: 'flex-start', marginTop: 5, fontSize: 13, fontWeight: '800' },
  accepted: { color: colors.success },
  pending: { color: colors.warning },
  error: { color: colors.danger, marginBottom: spacing.md },
});
