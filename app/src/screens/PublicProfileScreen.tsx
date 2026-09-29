import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { AppButton } from '../components/AppButton';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function PublicProfileScreen({ route, navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profile }, { data: permission }] = await Promise.all([
        api.get<User>(`/profiles/${route.params.userId}`),
        api.get<{ allowed: boolean }>('/photo-access', { params: { targetUserId: route.params.userId } }),
      ]);
      setUser(profile);
      setAllowed(Boolean(permission.allowed));
    } catch (value) {
      setError(getErrorMessage(value));
    } finally {
      setLoading(false);
    }
  }, [route.params.userId]);

  useEffect(() => { void load(); }, [load]);

  const requestPhotos = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post<{ message?: string }>('/photo-requests', { targetUserId: route.params.userId });
      Alert.alert('Solicitud enviada', data.message || 'La persona recibirá tu solicitud.');
    } catch (value) {
      Alert.alert('No se pudo enviar', getErrorMessage(value));
    } finally {
      setActionLoading(false);
    }
  };

  const report = () => Alert.alert(
    'Reportar perfil',
    'Nuestro equipo revisará este perfil. La otra persona no sabrá quién realizó el reporte.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar reporte', onPress: () => void (async () => {
          try {
            await api.post('/reports', { reportedUserId: route.params.userId, reason: 'inappropriate_content', source: 'profile' });
            Alert.alert('Reporte recibido', 'Gracias por ayudarnos a cuidar la comunidad.');
          } catch (value) {
            Alert.alert('No se pudo reportar', getErrorMessage(value));
          }
        })(),
      },
    ],
  );

  const block = () => Alert.alert(
    'Bloquear usuario',
    'Dejarán de verse y no podrán enviarse mensajes.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear', style: 'destructive', onPress: () => void (async () => {
          try {
            await api.post('/blocks', { blockedUserId: route.params.userId, source: 'profile' });
            Alert.alert('Usuario bloqueado');
            navigation.navigate('Tabs', { screen: 'Descubrir' });
          } catch (value) {
            Alert.alert('No se pudo bloquear', getErrorMessage(value));
          }
        })(),
      },
    ],
  );

  if (loading) return <Screen contentStyle={styles.center}><ActivityIndicator size="large" color={colors.gold} /></Screen>;
  if (!user) return <Screen><Text style={styles.error}>{error || 'Perfil no disponible.'}</Text></Screen>;
  const visible = Boolean(user.Profile?.photosVisible || allowed);
  const photos = visible ? user.Profile?.photos ?? [] : [];
  const name = user.Profile?.displayName || `${user.firstName} ${user.lastName}`;

  return (
    <Screen scroll>
      <Header title={name} subtitle={user.Profile?.verified ? 'Perfil verificado' : 'Miembro de la comunidad'} />
      {photos.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {photos.map((photo, index) => <Image key={`${photo.url}-${index}`} source={{ uri: photo.url }} style={styles.photo} />)}
        </ScrollView>
      ) : (
        <View style={styles.locked}>
          <Ionicons name="lock-closed" size={48} color={colors.gold} />
          <Text style={styles.lockedTitle}>Contenido privado</Text>
          <Text style={styles.lockedCopy}>Las imágenes sólo se muestran después de recibir autorización.</Text>
        </View>
      )}
      <View style={styles.details}>
        {user.Profile?.address ? <Text style={styles.meta}><Ionicons name="location-outline" /> {user.Profile.address}</Text> : null}
        <Text style={styles.section}>Sobre mí</Text>
        <Text style={styles.description}>{user.Profile?.description || 'Sin descripción todavía.'}</Text>
        <View style={styles.tags}>
          {user.Profile?.gender ? <Text style={styles.tag}>{user.Profile.gender}</Text> : null}
          {user.Profile?.lookingFor ? <Text style={styles.tag}>Busca: {user.Profile.lookingFor}</Text> : null}
        </View>
      </View>
      {!visible ? <AppButton title="Solicitar acceso a fotos" onPress={requestPhotos} loading={actionLoading} /> : null}
      <AppButton title="Enviar mensaje" variant="secondary" onPress={() => navigation.navigate('ChatDetail', { userId: user.id, name, avatar: photos[0]?.url })} style={styles.messageButton} />
      <View style={styles.safetyActions}>
        <AppButton title="Reportar" variant="secondary" onPress={report} style={styles.safetyButton} />
        <AppButton title="Bloquear" variant="danger" onPress={block} style={styles.safetyButton} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  gallery: { borderRadius: radius.lg, marginBottom: spacing.lg },
  photo: { width: 340, height: 440, borderRadius: radius.lg, marginRight: spacing.sm, backgroundColor: colors.surface },
  locked: { minHeight: 300, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  lockedTitle: { color: colors.goldSoft, fontSize: 22, fontWeight: '900' },
  lockedCopy: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  details: { paddingVertical: spacing.lg, gap: spacing.sm },
  meta: { color: colors.textMuted },
  section: { color: colors.goldSoft, fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: spacing.sm },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  tag: { color: colors.goldSoft, backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  messageButton: { marginTop: spacing.sm },
  safetyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  safetyButton: { flex: 1 },
  error: { color: colors.danger, marginTop: spacing.md },
});
