import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';

type Props = TextInputProps & { label: string; error?: string };

export function AppField({ label, error, secureTextEntry, style, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <TextInput
          {...props}
          secureTextEntry={Boolean(secureTextEntry) && !visible}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          style={[styles.input, style]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setVisible((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={21} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { color: colors.goldSoft, fontSize: 13, fontWeight: '700' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(25,17,29,0.92)' },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
