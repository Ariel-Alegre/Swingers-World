import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

export function AppButton({ title, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const inactive = disabled || loading;
  if (variant === 'primary') {
    return (
      <Pressable disabled={inactive} onPress={onPress} style={({ pressed }) => [style, pressed && styles.pressed, inactive && styles.disabled]}>
        <LinearGradient colors={[colors.gold, '#C8792E', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? <ActivityIndicator color={colors.black} /> : <Text style={styles.primaryText}>{title}</Text>}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.outline, variant === 'danger' && styles.danger, style, pressed && styles.pressed, inactive && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.outlineText, variant === 'danger' && styles.dangerText]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryText: { color: colors.black, fontSize: 16, fontWeight: '800' },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  outlineText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  danger: { borderColor: colors.danger },
  dangerText: { color: colors.danger },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
