import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/colors';

export function EmptyState({ icon, title, message }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; message: string }) {
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={42} color={colors.gold} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
