import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppField } from '../components/AppField';
import { Screen } from '../components/Screen';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password || !form.phone.trim()) {
      return setError('Completá todos los campos.');
    }
    if (form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (!accepted) return setError('Debés aceptar los términos para continuar.');
    setLoading(true);
    setError('');
    try {
      await api.post('/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        acceptedTerms: true,
      });
      navigation.replace('Login');
    } catch (value) {
      setError(getErrorMessage(value, 'No pudimos crear la cuenta.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View>
          <Text style={styles.eyebrow}>SWINGERS WORLD</Text>
          <Text style={styles.title}>Creá tu cuenta</Text>
          <Text style={styles.subtitle}>Sólo para mayores de 18 años.</Text>
        </View>
        <View style={styles.form}>
          <AppField label="Nombre" value={form.firstName} onChangeText={update('firstName')} autoComplete="given-name" />
          <AppField label="Apellido" value={form.lastName} onChangeText={update('lastName')} autoComplete="family-name" />
          <AppField label="Correo electrónico" value={form.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <AppField label="Teléfono" value={form.phone} onChangeText={update('phone')} keyboardType="phone-pad" autoComplete="tel" />
          <AppField label="Contraseña" value={form.password} onChangeText={update('password')} secureTextEntry autoComplete="new-password" />
          <Pressable onPress={() => setAccepted((value) => !value)} style={styles.checkRow}>
            <View style={[styles.checkbox, accepted && styles.checked]}>{accepted ? <Text style={styles.check}>✓</Text> : null}</View>
            <Text style={styles.checkText}>Confirmo que soy mayor de 18 años y acepto los términos y la política de privacidad.</Text>
          </Pressable>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => navigation.navigate('Legal', { document: 'terms' })}><Text style={styles.legalLink}>Ver términos</Text></Pressable>
            <Text style={styles.separator}>•</Text>
            <Pressable onPress={() => navigation.navigate('Legal', { document: 'privacy' })}><Text style={styles.legalLink}>Ver privacidad</Text></Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title="Crear cuenta" onPress={submit} loading={loading} />
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>Ya tengo cuenta</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  eyebrow: { color: colors.primary, fontWeight: '900', letterSpacing: 2.5, fontSize: 12 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm },
  form: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  checkRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: colors.white, fontWeight: '900' },
  checkText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  legalLink: { color: colors.goldSoft, fontSize: 13, fontWeight: '700' },
  separator: { color: colors.textMuted },
  back: { color: colors.goldSoft, fontWeight: '700', textAlign: 'center', padding: spacing.sm },
});
