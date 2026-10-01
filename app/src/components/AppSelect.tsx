import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: T | '';
  options: Array<SelectOption<T>>;
  placeholder: string;
  cancelLabel: string;
  onChange: (value: T) => void;
  error?: string;
};

export function AppSelect<T extends string>({ label, value, options, placeholder, cancelLabel, onChange, error }: Props<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const choose = (nextValue: T) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, error && styles.fieldError, pressed && styles.pressed]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>{selected?.label || placeholder}</Text>
        <Ionicons name="chevron-down" size={21} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel={cancelLabel} onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  key={option.value}
                  onPress={() => choose(option.value)}
                  style={[styles.option, isSelected && styles.selectedOption]}
                >
                  <Text style={[styles.optionText, isSelected && styles.selectedText]}>{option.label}</Text>
                  {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
            <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { color: colors.goldSoft, fontSize: 13, fontWeight: '700' },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(25,17,29,0.92)' },
  fieldError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
  pressed: { opacity: 0.82 },
  value: { flex: 1, color: colors.text, fontSize: 16 },
  placeholder: { color: colors.textMuted },
  modal: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: spacing.xs },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  selectedOption: { borderColor: colors.primary, backgroundColor: 'rgba(245,40,135,0.12)' },
  optionText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  selectedText: { color: colors.goldSoft },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
});
