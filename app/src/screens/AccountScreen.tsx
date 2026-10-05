import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { TabHeaderActions } from '../components/TabHeaderActions';
import { AppButton } from '../components/AppButton';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useSubscription } from '../context/SubscriptionContext';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Cuenta'>, NativeStackNavigationProp<RootStackParamList>>;

export function AccountScreen({ navigation }: { navigation: Navigation }) {
  const { user, signOut } = useAuth();
  const { t, formatProfileValue } = useLanguage();
  const { manage } = useSubscription();
  const [deleting, setDeleting] = useState(false);
  if (!user) return null;
  const profile = user.Profile;
  const name = profile?.displayName || `${user.firstName} ${user.lastName}`;
  const photo = profile?.photos?.[0]?.url;

  const confirmDelete = () => Alert.alert(
    t('account.deleteTitle'),
    t('account.deleteMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.deleteForever'), style: 'destructive', onPress: () => void (async () => {
          setDeleting(true);
          try {
            await api.delete('/account');
            await signOut();
          } catch (value) {
            Alert.alert(t('account.deleteFailed'), getErrorMessage(value, t('error.generic'), t));
          } finally {
            setDeleting(false);
          }
        })(),
      },
    ],
  );

  return (
    <Screen scroll>
      <Header title={t('account.title')} subtitle={t('account.subtitle')} action={<TabHeaderActions />} />
      <View style={styles.profileCard}>
        {photo ? <Image source={{ uri: photo }} style={styles.cover} /> : <UserAvatar name={name} size={110} />}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>{formatProfileValue(profile?.profileType === 'couple' ? 'couple' : 'single')}</Text>
          {profile?.verified ? <Text style={styles.badge}>{t('account.verified')}</Text> : null}
          <Text style={styles.badge}>{user.plan ? formatProfileValue(user.plan) : t('common.member')}</Text>
        </View>
      </View>

      <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.menuItem}>
        <Ionicons name="person-outline" size={22} color={colors.gold} /><Text style={styles.menuText}>{t('account.editProfile')}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Legal', { document: 'terms' })} style={[styles.menuItem, styles.nextItem]}>
        <Ionicons name="document-text-outline" size={22} color={colors.gold} /><Text style={styles.menuText}>{t('legal.terms.title')}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Legal', { document: 'privacy' })} style={[styles.menuItem, styles.nextItem]}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.gold} /><Text style={styles.menuText}>{t('legal.privacy.title')}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={() => void manage()} style={[styles.menuItem, styles.nextItem]}>
        <Ionicons name="card-outline" size={22} color={colors.gold} /><Text style={styles.menuText}>{t('subscription.manage')}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <LanguageSwitcher />
      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} />
        <View style={styles.privacyCopy}><Text style={styles.privacyTitle}>{t('account.privacyTitle')}</Text><Text style={styles.privacyText}>{t('account.privacyText')}</Text></View>
      </View>
      <AppButton title={t('account.signOut')} variant="secondary" onPress={() => void signOut()} style={styles.logout} />
      <AppButton title={t('account.delete')} variant="danger" onPress={confirmDelete} loading={deleting} style={styles.delete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cover: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: colors.gold },
  name: { color: colors.text, fontSize: 24, fontWeight: '900' },
  email: { color: colors.textMuted },
  badges: { flexDirection: 'row', gap: spacing.sm },
  badge: { color: colors.goldSoft, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, textTransform: 'capitalize' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  menuText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  nextItem: { marginTop: spacing.sm },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, marginTop: spacing.md, borderRadius: radius.md, backgroundColor: '#10211C', borderWidth: 1, borderColor: '#245641' },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.success, fontWeight: '800' },
  privacyText: { color: colors.textMuted, lineHeight: 20, marginTop: 3 },
  logout: { marginTop: spacing.xl },
  delete: { marginTop: spacing.sm },
});
