import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { colors, radius, spacing } from '../theme/colors';

const subscriptionPlans = [
  { icon: 'calendar-outline', label: 'subscription.monthly' },
  { icon: 'calendar-number-outline', label: 'subscription.sixMonths' },
  { icon: 'diamond-outline', label: 'subscription.annual' },
] as const;

const subscriptionBenefits = [
  'subscription.benefitTrial',
  'subscription.benefitAccess',
  'subscription.benefitCancel',
] as const;

export function SubscriptionScreen() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { error, showPaywall, restore } = useSubscription();
  const [working, setWorking] = useState<'paywall' | 'restore' | ''>('');

  const run = async (action: 'paywall' | 'restore') => {
    setWorking(action);
    try {
      if (action === 'paywall') await showPaywall();
      else await restore();
    } finally {
      setWorking('');
    }
  };

  return (
    <Screen scroll contentStyle={styles.screen}>
      <Image source={require('../../assets/swingers-world.png')} style={styles.logo} />
      <Text style={styles.eyebrow}>{t('subscription.premium')}</Text>
      <Text style={styles.title}>{t('subscription.title')}</Text>
      <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

      <View style={styles.plans}>
        {subscriptionPlans.map(({ icon, label }) => (
          <View key={label} style={styles.plan}>
            <Ionicons name={icon} size={22} color={colors.gold} />
            <Text style={styles.planText}>{t(label)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.benefits}>
        {subscriptionBenefits.map((label) => (
          <View key={label} style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={21} color={colors.success} />
            <Text style={styles.benefitText}>{t(label)}</Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton title={t('subscription.startTrial')} onPress={() => void run('paywall')} loading={working === 'paywall'} />
      <AppButton title={t('subscription.restore')} variant="secondary" onPress={() => void run('restore')} loading={working === 'restore'} style={styles.secondaryButton} />
      <AppButton title={t('account.signOut')} variant="secondary" onPress={() => void signOut()} style={styles.signOut} />
      <Text style={styles.legal}>{t('subscription.renewalDisclosure')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', paddingHorizontal: spacing.lg },
  logo: { width: 100, height: 100, alignSelf: 'center', borderRadius: 24, marginBottom: spacing.lg },
  eyebrow: { color: colors.gold, textAlign: 'center', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: colors.text, textAlign: 'center', fontSize: 30, fontWeight: '900', marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, textAlign: 'center', fontSize: 16, lineHeight: 23, marginTop: spacing.sm },
  plans: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  plan: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  planText: { color: colors.text, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  benefits: { gap: spacing.sm, marginVertical: spacing.xl },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { flex: 1, color: colors.text, lineHeight: 20 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  secondaryButton: { marginTop: spacing.sm },
  signOut: { marginTop: spacing.lg },
  legal: { color: colors.textMuted, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: spacing.lg },
});
