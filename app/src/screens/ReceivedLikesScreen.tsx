import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';
import type { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceivedLikes'>;

export function ReceivedLikesScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get<User[]>('/likes/received');
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('receivedLikes.subtitle')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} colors={[colors.gold]} />}
          contentContainerStyle={!users.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="heart-outline" title={t('receivedLikes.emptyTitle')} message={t('receivedLikes.emptyMessage')} />}
          renderItem={({ item }) => {
            const name = item.Profile?.displayName || `${item.firstName} ${item.lastName}`;
            const avatar = item.Profile?.photos?.[0]?.url || null;
            return (
              <Pressable onPress={() => navigation.navigate('Profile', { userId: item.id })} style={styles.row}>
                <UserAvatar uri={avatar} name={name} size={58} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{name}</Text>
                  <Text numberOfLines={1} style={styles.description}>{item.Profile?.description || t('common.viewProfile')}</Text>
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
  description: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
