import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { AppField } from '../components/AppField';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Completá tu correo y contraseña.');
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (value) {
      setError(getErrorMessage(value, 'No pudimos iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.brand}>
          <Image source={require('../../assets/swingers-world.png')} style={styles.logo} />
          <Text style={styles.welcome}>Tu mundo. Tus reglas.</Text>
          <Text style={styles.subtitle}>Conectá con personas reales en un espacio privado y respetuoso.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Bienvenido</Text>
          <AppField label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <AppField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title="Ingresar" onPress={submit} loading={loading} />
          <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.muted}>¿Todavía no tenés cuenta? </Text>
            <Text style={styles.link}>Crear cuenta</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  keyboard: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: { width: 164, height: 164, borderRadius: 36 },
  welcome: { color: colors.goldSoft, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.textMuted, textAlign: 'center', lineHeight: 21, maxWidth: 330 },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(25,17,29,0.94)' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  error: { color: colors.danger, fontSize: 13 },
  registerLink: { flexDirection: 'row', justifyContent: 'center', paddingTop: spacing.sm },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '800' },
});
