import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { AppButton } from '../components/AppButton';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Cuenta'>, NativeStackNavigationProp<RootStackParamList>>;

export function AccountScreen({ navigation }: { navigation: Navigation }) {
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  if (!user) return null;
  const profile = user.Profile;
  const name = profile?.displayName || `${user.firstName} ${user.lastName}`;
  const photo = profile?.photos?.[0]?.url;

  const confirmDelete = () => Alert.alert(
    'Eliminar cuenta',
    'Esta acción elimina tu perfil, mensajes, solicitudes y fotos. No se puede deshacer.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar definitivamente', style: 'destructive', onPress: () => void (async () => {
          setDeleting(true);
          try {
            await api.delete('/account');
            await signOut();
          } catch (value) {
            Alert.alert('No se pudo eliminar', getErrorMessage(value));
          } finally {
            setDeleting(false);
          }
        })(),
      },
    ],
  );

  return (
    <Screen scroll>
      <Header title="Mi cuenta" subtitle="Privacidad y configuración" />
      <View style={styles.profileCard}>
        {photo ? <Image source={{ uri: photo }} style={styles.cover} /> : <UserAvatar name={name} size={110} />}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badges}>
          {profile?.verified ? <Text style={styles.badge}>✓ Verificado</Text> : null}
          <Text style={styles.badge}>{user.plan || 'Miembro'}</Text>
        </View>
      </View>

      <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.menuItem}>
        <Ionicons name="person-outline" size={22} color={colors.gold} /><Text style={styles.menuText}>Editar perfil</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Legal', { document: 'privacy' })} style={[styles.menuItem, styles.nextItem]}>
        <Ionicons name="document-text-outline" size={22} color={colors.gold} /><Text style={styles.menuText}>Privacidad y términos</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} />
        <View style={styles.privacyCopy}><Text style={styles.privacyTitle}>Tu privacidad importa</Text><Text style={styles.privacyText}>Las fotos privadas deben ser autorizadas por vos y el acceso puede expirar.</Text></View>
      </View>
      <AppButton title="Cerrar sesión" variant="secondary" onPress={() => void signOut()} style={styles.logout} />
      <AppButton title="Eliminar mi cuenta" variant="danger" onPress={confirmDelete} loading={deleting} style={styles.delete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cover: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: colors.gold },
  name: { color: colors.text, fontSize: 24, fontWeight: '900' },
  email: { color: colors.textMuted },
  badges: { flexDirection: 'row', gap: spacing.sm },
  badge: { color: colors.goldSoft, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, textTransform: 'capitalize' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  menuText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  nextItem: { marginTop: spacing.sm },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, marginTop: spacing.md, borderRadius: radius.md, backgroundColor: '#10211C', borderWidth: 1, borderColor: '#245641' },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.success, fontWeight: '800' },
  privacyText: { color: colors.textMuted, lineHeight: 20, marginTop: 3 },
  logout: { marginTop: spacing.xl },
  delete: { marginTop: spacing.sm },
});
