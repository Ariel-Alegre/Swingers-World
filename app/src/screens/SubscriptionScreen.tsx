import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurchasesPackage } from 'react-native-purchases';
import { Screen } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useLanguage, type TranslationKey } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import type { PaywallStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/colors';

type Props = NativeStackScreenProps<PaywallStackParamList, 'Subscription'>;

const planOrder = ['$rc_monthly', '$rc_six_month', '$rc_annual'];

const benefits = [
  'subscription.benefitDiscover',
  'subscription.benefitMessages',
  'subscription.benefitPrivacy',
  'subscription.benefitAll',
] as const;

function planLabel(identifier: string): TranslationKey {
  if (identifier === '$rc_annual') return 'subscription.annual';
  if (identifier === '$rc_six_month') return 'subscription.sixMonths';
  return 'subscription.monthly';
}

function fullPrice(selectedPackage: PurchasesPackage) {
  return selectedPackage.product.defaultOption?.fullPricePhase?.price.formatted
    ?? selectedPackage.product.priceString;
}

function fullPriceAmount(selectedPackage: PurchasesPackage) {
  const micros = selectedPackage.product.defaultOption?.fullPricePhase?.price.amountMicros;
  return typeof micros === 'number' ? micros / 1_000_000 : selectedPackage.product.price;
}

export function SubscriptionScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { error, packages, offeringsLoading, loadOfferings, purchase, restore } = useSubscription();
  const [selectedIdentifier, setSelectedIdentifier] = useState('');
  const [working, setWorking] = useState<'purchase' | 'restore' | ''>('');

  const orderedPackages = useMemo(() => [...packages].sort((left, right) => {
    const leftIndex = planOrder.indexOf(left.identifier);
    const rightIndex = planOrder.indexOf(right.identifier);
    return (leftIndex < 0 ? planOrder.length : leftIndex) - (rightIndex < 0 ? planOrder.length : rightIndex);
  }), [packages]);

  useEffect(() => {
    if (selectedIdentifier && orderedPackages.some((item) => item.identifier === selectedIdentifier)) return;
    setSelectedIdentifier(
      orderedPackages.find((item) => item.identifier === '$rc_annual')?.identifier
      ?? orderedPackages[0]?.identifier
      ?? '',
    );
  }, [orderedPackages, selectedIdentifier]);

  const selectedPackage = orderedPackages.find((item) => item.identifier === selectedIdentifier);
  const monthlyPackage = orderedPackages.find((item) => item.identifier === '$rc_monthly');

  const savingsFor = (item: PurchasesPackage) => {
    if (!monthlyPackage || item.identifier === '$rc_monthly') return 0;
    if (monthlyPackage.product.currencyCode !== item.product.currencyCode) return 0;
    const months = item.identifier === '$rc_annual' ? 12 : item.identifier === '$rc_six_month' ? 6 : 0;
    const monthlyAmount = fullPriceAmount(monthlyPackage);
    const itemAmount = fullPriceAmount(item);
    if (!months || monthlyAmount <= 0 || itemAmount <= 0) return 0;
    return Math.max(0, Math.round((1 - itemAmount / (monthlyAmount * months)) * 100));
  };

  const buy = async () => {
    if (!selectedPackage) return;
    setWorking('purchase');
    try {
      await purchase(selectedPackage);
    } finally {
      setWorking('');
    }
  };

  const restorePurchases = async () => {
    setWorking('restore');
    try {
      await restore();
    } finally {
      setWorking('');
    }
  };

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.logoGlow}>
          <Image source={require('../../assets/swingers-world.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.eyebrow}>{t('subscription.premium')}</Text>
        <Text style={styles.title}>{t('subscription.title')}</Text>
        <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>
      </View>

      <View style={styles.benefits}>
        {benefits.map((key) => (
          <View key={key} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="checkmark" size={15} color={colors.black} />
            </View>
            <Text style={styles.benefitText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('subscription.choosePlan')}</Text>
      {offeringsLoading ? (
        <View style={styles.loadingPlans}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.loadingText}>{t('subscription.loadingPlans')}</Text>
        </View>
      ) : orderedPackages.length ? (
        <View style={styles.plans}>
          {orderedPackages.map((item) => {
            const selected = item.identifier === selectedIdentifier;
            const savings = savingsFor(item);
            const monthlyPrice = item.identifier === '$rc_monthly' ? null : item.product.pricePerMonthString;
            return (
              <Pressable
                key={item.identifier}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSelectedIdentifier(item.identifier)}
                style={({ pressed }) => [styles.plan, selected && styles.planSelected, pressed && styles.pressed]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.planCopy}>
                  <View style={styles.planHeading}>
                    <Text style={styles.planName}>{t(planLabel(item.identifier))}</Text>
                    {item.identifier === '$rc_annual' ? (
                      <View style={styles.badge}><Text style={styles.badgeText}>{t('subscription.bestValue')}</Text></View>
                    ) : null}
                    {savings > 0 ? (
                      <View style={styles.savingsBadge}><Text style={styles.savingsText}>{t('subscription.save', { percent: savings })}</Text></View>
                    ) : null}
                  </View>
                  {monthlyPrice ? <Text style={styles.perMonth}>{t('subscription.perMonth', { price: monthlyPrice })}</Text> : null}
                </View>
                <Text style={styles.price}>{fullPrice(item)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.unavailable}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.gold} />
          <Text style={styles.unavailableText}>{t('subscription.plansUnavailable')}</Text>
          <Pressable onPress={() => void loadOfferings()} style={styles.retry}>
            <Text style={styles.retryText}>{t('subscription.retry')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.trialNote}>
        <Ionicons name="sparkles" size={17} color={colors.goldSoft} />
        <Text style={styles.trialText}>{t('subscription.eligibleTrial')}</Text>
      </View>

      {error && orderedPackages.length ? <Text style={styles.error}>{t('subscription.operationFailed')}</Text> : null}
      <AppButton
        title={t('subscription.continue')}
        onPress={() => void buy()}
        loading={working === 'purchase'}
        disabled={!selectedPackage || offeringsLoading || working === 'restore'}
      />
      <AppButton
        title={t('subscription.restore')}
        variant="secondary"
        onPress={() => void restorePurchases()}
        loading={working === 'restore'}
        disabled={working === 'purchase'}
        style={styles.secondaryButton}
      />

      <Text style={styles.renewal}>{t('subscription.renewalDisclosure')}</Text>
      <Text style={styles.consent}>{t('subscription.legalConsent')}</Text>
      <View style={styles.legalLinks}>
        <Text onPress={() => navigation.navigate('Legal', { document: 'terms' })} style={styles.legalLink}>{t('subscription.terms')}</Text>
        <Text style={styles.legalSeparator}>•</Text>
        <Text onPress={() => navigation.navigate('Legal', { document: 'privacy' })} style={styles.legalLink}>{t('subscription.privacy')}</Text>
      </View>
      <Pressable onPress={() => void signOut()} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={17} color={colors.textMuted} />
        <Text style={styles.signOutText}>{t('account.signOut')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, maxWidth: 620, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center' },
  logoGlow: { width: 102, height: 102, borderRadius: 28, padding: 5, backgroundColor: 'rgba(234, 183, 106, 0.12)', borderWidth: 1, borderColor: 'rgba(234, 183, 106, 0.38)', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  logo: { width: '100%', height: '100%', borderRadius: 23 },
  eyebrow: { color: colors.gold, textAlign: 'center', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginTop: spacing.md },
  title: { color: colors.text, textAlign: 'center', fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  benefits: { gap: 10, marginTop: spacing.lg, padding: spacing.md, backgroundColor: 'rgba(36, 23, 39, 0.72)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  benefitIcon: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success },
  benefitText: { flex: 1, color: colors.text, lineHeight: 20, fontSize: 14 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.lg, marginBottom: spacing.sm },
  loadingPlans: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.textMuted },
  plans: { gap: 10 },
  plan: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  planSelected: { borderColor: colors.gold, backgroundColor: colors.surfaceRaised, shadowColor: colors.gold, shadowOpacity: 0.14, shadowRadius: 12, elevation: 3 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.995 }] },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.gold },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.gold },
  planCopy: { flex: 1, minWidth: 0 },
  planHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  planName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  perMonth: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  price: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  badge: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.black, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  savingsBadge: { backgroundColor: 'rgba(84, 214, 155, 0.14)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  savingsText: { color: colors.success, fontSize: 10, fontWeight: '900' },
  unavailable: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  unavailableText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  retry: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryText: { color: colors.gold, fontWeight: '800' },
  trialNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginVertical: spacing.md },
  trialText: { color: colors.goldSoft, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center', lineHeight: 19, marginBottom: spacing.sm },
  secondaryButton: { marginTop: spacing.sm },
  renewal: { color: colors.textMuted, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: spacing.md },
  consent: { color: colors.textMuted, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: spacing.sm },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 6 },
  legalLink: { color: colors.gold, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  legalSeparator: { color: colors.textMuted },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: spacing.md, marginTop: spacing.sm },
  signOutText: { color: colors.textMuted, fontWeight: '700' },
});
