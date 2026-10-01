import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage, type AppLanguage } from '../context/LanguageContext';
import { colors, radius, spacing } from '../theme/colors';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const options: Array<{ value: AppLanguage; label: string }> = [
    { value: 'es', label: t('language.spanish') },
    { value: 'en', label: t('language.english') },
  ];

  return (
    <View style={[styles.wrapper, compact && styles.compactWrapper]}>
      {!compact ? <Text style={styles.label}>{t('language.label')}</Text> : null}
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: language === option.value }}
            key={option.value}
            onPress={() => void setLanguage(option.value)}
            style={[styles.option, language === option.value && styles.selected]}
          >
            <Text style={[styles.optionText, language === option.value && styles.selectedText]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm, marginVertical: spacing.md },
  compactWrapper: { alignItems: 'center', marginVertical: spacing.sm },
  label: { color: colors.text, fontSize: 16, fontWeight: '800' },
  options: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  option: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
  selected: { backgroundColor: colors.primary },
  optionText: { color: colors.textMuted, fontWeight: '700' },
  selectedText: { color: colors.white },
});
