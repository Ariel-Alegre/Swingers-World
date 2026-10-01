import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { colors, radius, spacing } from '../theme/colors';
import { useLanguage, type TranslationKey } from '../context/LanguageContext';

type LegalRoute = RouteProp<{ Legal: { document: 'terms' | 'privacy' } }, 'Legal'>;

const sections: Record<'terms' | 'privacy', { title: TranslationKey; intro: TranslationKey; items: Array<[TranslationKey, TranslationKey]> }> = {
  terms: {
    title: 'legal.terms.title',
    intro: 'legal.terms.intro',
    items: [
      ['legal.terms.adults.title', 'legal.terms.adults.body'],
      ['legal.terms.consent.title', 'legal.terms.consent.body'],
      ['legal.terms.respect.title', 'legal.terms.respect.body'],
      ['legal.terms.moderation.title', 'legal.terms.moderation.body'],
      ['legal.terms.account.title', 'legal.terms.account.body'],
    ],
  },
  privacy: {
    title: 'legal.privacy.title',
    intro: 'legal.privacy.intro',
    items: [
      ['legal.privacy.account.title', 'legal.privacy.account.body'],
      ['legal.privacy.photos.title', 'legal.privacy.photos.body'],
      ['legal.privacy.messages.title', 'legal.privacy.messages.body'],
      ['legal.privacy.control.title', 'legal.privacy.control.body'],
      ['legal.privacy.security.title', 'legal.privacy.security.body'],
    ],
  },
} as const;

export function LegalScreen() {
  const route = useRoute<LegalRoute>();
  const { t } = useLanguage();
  const content = sections[route.params.document];
  return (
    <Screen scroll>
      <Header title={t(content.title)} subtitle={t('legal.updated')} />
      <Text style={styles.intro}>{t(content.intro)}</Text>
      {content.items.map(([title, body]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.title}>{t(title)}</Text>
          <Text style={styles.body}>{t(body)}</Text>
        </View>
      ))}
      <Text style={styles.note}>{t('legal.note')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.goldSoft, fontSize: 16, fontWeight: '900', marginBottom: spacing.xs },
  body: { color: colors.textMuted, lineHeight: 21 },
  note: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
});
