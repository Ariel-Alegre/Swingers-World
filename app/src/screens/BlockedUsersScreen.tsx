import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { useLanguage } from '../context/LanguageContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';

export function BlockedUsersScreen() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get<User[]>('/blocks');
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

  const confirmUnblock = (user: User, name: string) => {
    Alert.alert(
      t('blockedUsers.confirmTitle'),
      t('blockedUsers.confirmMessage', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('blockedUsers.unblock'),
          onPress: () => void (async () => {
            setUnblockingId(user.id);
            try {
              await api.delete(`/blocks/${user.id}`);
              setUsers((current) => current.filter((item) => item.id !== user.id));
              setError('');
            } catch (value) {
              Alert.alert(t('blockedUsers.confirmTitle'), getErrorMessage(value, t('blockedUsers.failed'), t));
            } finally {
              setUnblockingId(null);
            }
          })(),
        },
      ],
    );
  };

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('blockedUsers.subtitle')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.gold} /> : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.gold} colors={[colors.gold]} />}
          contentContainerStyle={!users.length ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState icon="ban-outline" title={t('blockedUsers.emptyTitle')} message={t('blockedUsers.emptyMessage')} />}
          renderItem={({ item }) => {
            const name = item.Profile?.displayName || `${item.firstName} ${item.lastName}`;
            const avatar = item.Profile?.photosVisible ? item.Profile.photos?.[0]?.url : null;
            return (
              <View style={styles.row}>
                <UserAvatar uri={avatar} name={name} size={58} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.blockedLabel}>{t('blockedUsers.title')}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('blockedUsers.unblock')} ${name}`}
                  disabled={unblockingId === item.id}
                  onPress={() => confirmUnblock(item, name)}
                  style={({ pressed }) => [styles.unblockButton, pressed && styles.unblockPressed]}
                >
                  {unblockingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.goldSoft} />
                  ) : (
                    <>
                      <Ionicons name="lock-open-outline" size={18} color={colors.goldSoft} />
                      <Text style={styles.unblockText}>{t('blockedUsers.unblock')}</Text>
                    </>
                  )}
                </Pressable>
              </View>
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
  blockedLabel: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  unblockButton: { minHeight: 38, minWidth: 44, paddingHorizontal: spacing.sm, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.gold },
  unblockPressed: { opacity: 0.78 },
  unblockText: { color: colors.goldSoft, fontSize: 12, fontWeight: '800' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
