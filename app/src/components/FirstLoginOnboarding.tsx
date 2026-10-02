import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';

type OnboardingPage = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

export function FirstLoginOnboarding() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [pageIndex, setPageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pages = useMemo<OnboardingPage[]>(() => [
    { icon: 'person-circle-outline', title: t('onboarding.profileTitle'), body: t('onboarding.profileBody') },
    { icon: 'compass-outline', title: t('onboarding.discoverTitle'), body: t('onboarding.discoverBody') },
    { icon: 'shield-checkmark-outline', title: t('onboarding.privacyTitle'), body: t('onboarding.privacyBody') },
    { icon: 'chatbubbles-outline', title: t('onboarding.chatTitle'), body: t('onboarding.chatBody') },
  ], [t]);

  const complete = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await api.patch('/me/onboarding-complete');
      await refreshUser();
    } catch (value) {
      setError(getErrorMessage(value, t('onboarding.error'), t));
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.onboardingCompletedAt !== null) return null;

  const page = pages[pageIndex] ?? pages[0]!;
  const isLastPage = pageIndex === pages.length - 1;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.screen}>
        <View style={styles.topRow}>
          <Image source={require('../../assets/swingers-world.png')} style={styles.logo} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
            disabled={saving}
            onPress={() => void complete()}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name={page.icon} size={46} color={colors.goldSoft} />
          </View>
          <Text style={styles.eyebrow}>{t('onboarding.welcome')}</Text>
          <Text style={styles.title}>{page.title}</Text>
          <Text style={styles.body}>{page.body}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {pages.map((_, index) => (
              <View key={index} style={[styles.dot, index === pageIndex && styles.activeDot]} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            {pageIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setPageIndex((current) => current - 1)}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
                <Text style={styles.backText}>{t('onboarding.back')}</Text>
              </Pressable>
            ) : <View style={styles.backPlaceholder} />}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => isLastPage ? void complete() : setPageIndex((current) => current + 1)}
              style={({ pressed }) => [styles.nextButton, pressed && styles.pressed, saving && styles.disabled]}
            >
              {saving ? <ActivityIndicator color={colors.white} /> : (
                <>
                  <Text style={styles.nextText}>{t(isLastPage ? 'onboarding.start' : 'onboarding.next')}</Text>
                  <Ionicons name={isLastPage ? 'checkmark' : 'arrow-forward'} size={20} color={colors.white} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 54, paddingHorizontal: spacing.lg, paddingBottom: 30, backgroundColor: colors.background },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 58, height: 58, borderRadius: 15 },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  skipText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.gold },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { maxWidth: 360, marginTop: spacing.sm, color: colors.text, fontSize: 30, lineHeight: 37, fontWeight: '900', textAlign: 'center' },
  body: { maxWidth: 390, marginTop: spacing.md, color: colors.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  footer: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  dots: { height: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginBottom: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  activeDot: { width: 24, backgroundColor: colors.primary },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: spacing.sm },
  actions: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  backPlaceholder: { flex: 1 },
  backButton: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  nextButton: { flex: 1.35, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary },
  nextText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.6 },
});
