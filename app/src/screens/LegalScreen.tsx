import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { colors, radius, spacing } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { legalDocuments } from '../content/legalDocuments';

type LegalRoute = RouteProp<{ Legal: { document: 'terms' | 'privacy' } }, 'Legal'>;

export function LegalScreen() {
  const route = useRoute<LegalRoute>();
  const { language } = useLanguage();
  const content = legalDocuments[language][route.params.document];
  return (
    <Screen scroll>
      <Header title={content.title} subtitle={content.updated} />
      <Text style={styles.intro}>{content.intro}</Text>
      {content.sections.map((section) => (
        <View key={section.heading} style={styles.card}>
          <Text style={styles.title}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
      <Text style={styles.note}>{content.note}</Text>
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
