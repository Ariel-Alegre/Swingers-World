import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { AppField } from '../components/AppField';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;
type LocalPhoto = { uri: string; name: string; type: string };

export function EditProfileScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const profile = user?.Profile;
  const [description, setDescription] = useState(profile?.description || '');
  const [location, setLocation] = useState(profile?.address || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [lookingFor, setLookingFor] = useState(profile?.lookingFor || '');
  const [publicProfile, setPublicProfile] = useState(profile?.publicProfile ?? true);
  const [publicPhotos, setPublicPhotos] = useState(profile?.photosVisible ?? false);
  const [newPhotos, setNewPhotos] = useState<LocalPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const existingPhotos = useMemo(() => profile?.photos ?? [], [profile?.photos]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 9 - existingPhotos.length), quality: 0.82 });
    if (result.canceled) return;
    const picked = result.assets.slice(0, 9 - existingPhotos.length).map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `perfil-${Date.now()}-${index}.jpg`, type: asset.mimeType || 'image/jpeg' }));
    setNewPhotos(picked);
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('description', description.trim());
      data.append('address', location.trim());
      data.append('gender', gender.trim());
      data.append('lookingFor', lookingFor.trim());
      data.append('publicProfile', String(publicProfile));
      data.append('photosVisible', String(publicPhotos));
      newPhotos.forEach((photo) => data.append('photos', photo as unknown as Blob));
      await api.patch('/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      Alert.alert('Perfil actualizado', 'Tus cambios se guardaron correctamente.');
      navigation.goBack();
    } catch (value) {
      Alert.alert('No se pudo guardar', getErrorMessage(value));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Header title="Editar perfil" subtitle="Mostrá quién sos, sin perder el control" />
      <Text style={styles.section}>FOTOS</Text>
      <View style={styles.photos}>
        {existingPhotos.map((photo) => <Image key={photo.url} source={{ uri: photo.url }} style={styles.photo} />)}
        {newPhotos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.photo} />)}
        {existingPhotos.length + newPhotos.length < 9 ? (
          <Pressable onPress={() => void pickPhotos()} style={[styles.photo, styles.addPhoto]}><Ionicons name="add" size={30} color={colors.gold} /><Text style={styles.addText}>Agregar</Text></Pressable>
        ) : null}
      </View>
      <View style={styles.form}>
        <AppField label="Descripción" value={description} onChangeText={setDescription} multiline maxLength={1000} />
        <AppField label="Ciudad o zona" value={location} onChangeText={setLocation} />
        <AppField label="Género" value={gender} onChangeText={setGender} placeholder="Male / Female" />
        <AppField label="Qué buscás" value={lookingFor} onChangeText={setLookingFor} placeholder="Men / Women / Both" />
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Perfil visible</Text><Text style={styles.switchText}>Permitir que aparezca en Descubrir</Text></View><Switch value={publicProfile} onValueChange={setPublicProfile} trackColor={{ true: colors.primary }} /></View>
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Fotos públicas</Text><Text style={styles.switchText}>Si está desactivado, deberán solicitarte acceso</Text></View><Switch value={publicPhotos} onValueChange={setPublicPhotos} trackColor={{ true: colors.primary }} /></View>
        <AppButton title="Guardar cambios" onPress={() => void save()} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.goldSoft, fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: spacing.sm },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  photo: { width: 94, height: 118, borderRadius: radius.md, backgroundColor: colors.surface },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold },
  addText: { color: colors.goldSoft, fontSize: 12, marginTop: spacing.xs },
  form: { gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.text, fontWeight: '800' },
  switchText: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
