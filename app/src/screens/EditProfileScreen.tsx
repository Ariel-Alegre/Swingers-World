import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { getCalendars } from 'expo-localization';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { AppField } from '../components/AppField';
import { AppButton } from '../components/AppButton';
import { AppSelect } from '../components/AppSelect';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;
type LocalPhoto = { uri: string; name: string; type: string };
type Gender = 'Male' | 'Female';
type LookingFor = 'Men' | 'Women' | 'Both';
type LookingForProfileType = 'single' | 'couple' | 'both';
type CoupleType = 'woman_man' | 'two_women' | 'two_men' | 'other';
type LookingForCoupleType = CoupleType | 'all';
type EditField = 'photos' | 'displayName' | 'partnerFirstName' | 'partnerLastName' | 'coupleType' | 'description' | 'location' | 'gender' | 'lookingForProfileType' | 'lookingFor' | 'lookingForCoupleType';
type EditErrors = Partial<Record<EditField, string>>;

function normalizeGender(value?: string | null): Gender | '' {
  const normalized = value?.trim().toLowerCase();
  if (['male', 'man', 'masculino', 'hombre'].includes(normalized || '')) return 'Male';
  if (['female', 'woman', 'femenino', 'mujer'].includes(normalized || '')) return 'Female';
  return '';
}

function normalizeLookingFor(value?: string | null): LookingFor | '' {
  const normalized = value?.trim().toLowerCase();
  if (['men', 'man', 'male', 'hombres', 'hombre'].includes(normalized || '')) return 'Men';
  if (['women', 'woman', 'female', 'mujeres', 'mujer'].includes(normalized || '')) return 'Women';
  if (['both', 'ambos', 'ambas', 'todos', 'todas'].includes(normalized || '')) return 'Both';
  return '';
}

function normalizeCoupleType(value?: string | null): CoupleType | '' {
  return ['woman_man', 'two_women', 'two_men', 'other'].includes(value || '') ? value as CoupleType : '';
}

function normalizeLookingForCoupleType(value?: string | null): LookingForCoupleType | '' {
  if (value === 'other') return 'all';
  return ['woman_man', 'two_women', 'two_men', 'all'].includes(value || '') ? value as LookingForCoupleType : '';
}

export function EditProfileScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const { t, formatProfileValue } = useLanguage();
  const profile = user?.Profile;
  const profileType = profile?.profileType || 'single';
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [partnerFirstName, setPartnerFirstName] = useState(profile?.partnerFirstName || '');
  const [partnerLastName, setPartnerLastName] = useState(profile?.partnerLastName || '');
  const [coupleType, setCoupleType] = useState<CoupleType | ''>(normalizeCoupleType(profile?.coupleType));
  const [description, setDescription] = useState(profile?.description || '');
  const [location, setLocation] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [region, setRegion] = useState(profile?.region || '');
  const [countryCode, setCountryCode] = useState(profile?.countryCode || '');
  const [timezone] = useState(profile?.timezone || getCalendars()[0]?.timeZone || 'UTC');
  const [latitude, setLatitude] = useState<number | null>(profile?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(profile?.longitude ?? null);
  const [locationSource, setLocationSource] = useState<'existing' | 'automatic' | 'manual'>('existing');
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(profile?.locationTrackingEnabled ?? false);
  const [locating, setLocating] = useState(false);
  const [gender, setGender] = useState<Gender | ''>(normalizeGender(profile?.gender));
  const [lookingForProfileType, setLookingForProfileType] = useState<LookingForProfileType | ''>(profile?.lookingForProfileType || 'single');
  const [lookingFor, setLookingFor] = useState<LookingFor | ''>(normalizeLookingFor(profile?.lookingFor));
  const [lookingForCoupleType, setLookingForCoupleType] = useState<LookingForCoupleType | ''>(normalizeLookingForCoupleType(profile?.lookingForCoupleType));
  const [publicProfile, setPublicProfile] = useState(profile?.publicProfile ?? true);
  const [publicPhotos, setPublicPhotos] = useState(profile?.photosVisible ?? false);
  const [newPhotos, setNewPhotos] = useState<LocalPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EditErrors>({});
  const existingPhotos = useMemo(() => profile?.photos ?? [], [profile?.photos]);
  const clearFieldError = (key: EditField) => setFieldErrors((current) => ({ ...current, [key]: undefined }));

  const pickPhotos = async () => {
    const availableSlots = 9 - existingPhotos.length - newPhotos.length;
    if (availableSlots <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: availableSlots, quality: 0.82 });
    if (result.canceled) return;
    const picked = result.assets.slice(0, availableSlots).map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `perfil-${Date.now()}-${index}.jpg`, type: asset.mimeType || 'image/jpeg' }));
    setNewPhotos((current) => [...current, ...picked].slice(0, 9 - existingPhotos.length));
    clearFieldError('photos');
  };

  const deleteExistingPhoto = (url: string) => {
    if (existingPhotos.length <= 1) {
      Alert.alert(t('edit.keepOnePhotoTitle'), t('edit.keepOnePhotoMessage'));
      return;
    }

    Alert.alert(
      t('edit.removePhotoTitle'),
      t('edit.removePhotoMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('edit.remove'),
          style: 'destructive',
          onPress: () => void (async () => {
            setDeletingPhoto(url);
            try {
              await api.delete('/profile/photo', { params: { url } });
              await refreshUser();
            } catch (value) {
              Alert.alert(t('edit.removePhotoFailed'), getErrorMessage(value, t('error.generic'), t));
            } finally {
              setDeletingPhoto(null);
            }
          })(),
        },
      ],
    );
  };

  const updateLocationManually = (value: string) => {
    setLocation(value);
    setCity(value);
    setRegion('');
    setCountryCode('');
    setLatitude(null);
    setLongitude(null);
    setLocationSource('manual');
    setLocationTrackingEnabled(false);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(t('edit.locationPermissionTitle'), t('edit.locationPermissionMessage'));
        return false;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const place = places[0];
      const detectedCity = place?.city || place?.district || place?.subregion || '';
      if (!place || !detectedCity) {
        Alert.alert(t('edit.locationUnavailableTitle'), t('edit.locationUnavailableMessage'));
        return false;
      }

      const parts = [detectedCity, place.region, place.country].filter(
        (part, index, values): part is string => Boolean(part) && values.indexOf(part) === index,
      );
      setLocation(parts.join(', '));
      clearFieldError('location');
      setCity(detectedCity);
      setRegion(place.region || '');
      setCountryCode(place.isoCountryCode || '');
      setLatitude(Number(position.coords.latitude.toFixed(2)));
      setLongitude(Number(position.coords.longitude.toFixed(2)));
      setLocationSource('automatic');
      return true;
    } catch {
      Alert.alert(t('edit.locationUnavailableTitle'), t('edit.locationUnavailableMessage'));
      return false;
    } finally {
      setLocating(false);
    }
  };

  const toggleAutomaticLocation = async (enabled: boolean) => {
    if (!enabled) {
      setLocationTrackingEnabled(false);
      return;
    }
    const locationWasDetected = await useCurrentLocation();
    setLocationTrackingEnabled(locationWasDetected);
  };

  const save = async () => {
    const required = t('validation.required');
    const nextErrors: EditErrors = {};
    if (!existingPhotos.length && !newPhotos.length) nextErrors.photos = t('validation.photoRequired');
    if (!displayName.trim()) nextErrors.displayName = required;
    if (!description.trim()) nextErrors.description = required;
    if (!location.trim()) nextErrors.location = required;
    if (!lookingForProfileType) nextErrors.lookingForProfileType = required;
    if (lookingForProfileType === 'single' && !lookingFor) nextErrors.lookingFor = required;
    if (lookingForProfileType === 'couple' && !lookingForCoupleType) nextErrors.lookingForCoupleType = required;
    if (profileType === 'single' && !gender) nextErrors.gender = required;
    if (profileType === 'couple') {
      if (!partnerFirstName.trim()) nextErrors.partnerFirstName = required;
      if (!partnerLastName.trim()) nextErrors.partnerLastName = required;
      if (!coupleType) nextErrors.coupleType = required;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const data = new FormData();
      data.append('description', description.trim());
      data.append('displayName', displayName.trim());
      if (profileType === 'couple') {
        data.append('partnerFirstName', partnerFirstName.trim());
        data.append('partnerLastName', partnerLastName.trim());
        data.append('coupleType', coupleType);
      }
      data.append('address', location.trim());
      data.append('city', city.trim());
      data.append('region', region.trim());
      data.append('countryCode', countryCode.trim());
      data.append('timezone', timezone);
      data.append('locationSource', locationSource);
      data.append('locationTrackingEnabled', String(locationTrackingEnabled));
      if (latitude !== null) data.append('latitude', String(latitude));
      if (longitude !== null) data.append('longitude', String(longitude));
      if (profileType === 'single') data.append('gender', gender.trim());
      data.append('lookingForProfileType', lookingForProfileType);
      if (lookingForProfileType === 'single') data.append('lookingFor', lookingFor.trim());
      if (lookingForProfileType === 'couple') data.append('lookingForCoupleType', lookingForCoupleType);
      data.append('publicProfile', String(publicProfile));
      data.append('photosVisible', String(publicPhotos));
      newPhotos.forEach((photo) => data.append('photos', photo as unknown as Blob));
      await api.patch('/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      Alert.alert(t('edit.savedTitle'), t('edit.savedMessage'));
      navigation.goBack();
    } catch (value) {
      Alert.alert(t('edit.failed'), getErrorMessage(value, t('error.generic'), t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Header title={t('edit.title')} subtitle={t('edit.subtitle')} />
      <Text style={styles.profileType}>{t('edit.profileType', { value: formatProfileValue(profileType) })}</Text>
      <Text style={styles.section}>{t('edit.photos')}</Text>
      <View style={[styles.photos, fieldErrors.photos && styles.photosInvalid]}>
        {existingPhotos.map((photo) => (
          <View key={photo.url} style={styles.photoWrap}>
            <Image source={{ uri: photo.url }} style={styles.photo} />
            <Pressable disabled={deletingPhoto === photo.url} accessibilityRole="button" accessibilityLabel={t('edit.removePhoto')} onPress={() => deleteExistingPhoto(photo.url)} style={styles.removePhoto}>
              {deletingPhoto === photo.url ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="close" size={18} color={colors.white} />}
            </Pressable>
          </View>
        ))}
        {newPhotos.map((photo) => (
          <View key={photo.uri} style={styles.photoWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('edit.removePhoto')} onPress={() => setNewPhotos((current) => current.filter((item) => item.uri !== photo.uri))} style={styles.removePhoto}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {existingPhotos.length + newPhotos.length < 9 ? (
          <Pressable onPress={() => void pickPhotos()} style={[styles.photo, styles.addPhoto]}><Ionicons name="add" size={30} color={colors.gold} /><Text style={styles.addText}>{t('edit.add')}</Text></Pressable>
        ) : null}
      </View>
      {fieldErrors.photos ? <Text style={styles.fieldError}>{fieldErrors.photos}</Text> : null}
      <View style={styles.form}>
        <AppField label={profileType === 'couple' ? t('edit.coupleDisplayName') : t('edit.displayName')} value={displayName} error={fieldErrors.displayName} onChangeText={(value) => { setDisplayName(value); clearFieldError('displayName'); }} />
        {profileType === 'couple' ? (
          <>
            <AppField label={t('edit.partnerName')} value={partnerFirstName} error={fieldErrors.partnerFirstName} onChangeText={(value) => { setPartnerFirstName(value); clearFieldError('partnerFirstName'); }} />
            <AppField label={t('edit.partnerLastName')} value={partnerLastName} error={fieldErrors.partnerLastName} onChangeText={(value) => { setPartnerLastName(value); clearFieldError('partnerLastName'); }} />
            <AppSelect
              label={t('edit.coupleType')}
              value={coupleType}
              placeholder={t('common.selectOption')}
              cancelLabel={t('common.cancel')}
              error={fieldErrors.coupleType}
              onChange={(value) => { setCoupleType(value); clearFieldError('coupleType'); }}
              options={[
                { value: 'woman_man', label: t('value.womanMan') },
                { value: 'two_women', label: t('value.twoWomen') },
                { value: 'two_men', label: t('value.twoMen') },
                { value: 'other', label: t('value.otherCouple') },
              ]}
            />
          </>
        ) : null}
        <AppField label={profileType === 'couple' ? t('edit.coupleDescription') : t('edit.description')} value={description} error={fieldErrors.description} onChangeText={(value) => { setDescription(value); clearFieldError('description'); }} multiline maxLength={1000} />
        <AppField label={t('edit.location')} value={location} error={fieldErrors.location} onChangeText={(value) => { updateLocationManually(value); clearFieldError('location'); }} />
        <Pressable disabled={locating} onPress={() => void useCurrentLocation()} style={({ pressed }) => [styles.locationButton, pressed && styles.locationButtonPressed]}>
          {locating ? <ActivityIndicator color={colors.gold} /> : <Ionicons name="locate-outline" size={21} color={colors.gold} />}
          <Text style={styles.locationButtonText}>{locating ? t('edit.detectingLocation') : t('edit.useLocation')}</Text>
        </Pressable>
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>{t('edit.autoLocation')}</Text><Text style={styles.switchText}>{t('edit.autoLocationHint')}</Text></View><Switch disabled={locating} value={locationTrackingEnabled} onValueChange={(enabled) => void toggleAutomaticLocation(enabled)} trackColor={{ true: colors.primary }} /></View>
        {profileType === 'single' ? (
          <AppSelect
            label={t('edit.gender')}
            value={gender}
            placeholder={t('common.selectOption')}
            cancelLabel={t('common.cancel')}
            error={fieldErrors.gender}
            onChange={(value) => { setGender(value); clearFieldError('gender'); }}
            options={[
              { value: 'Male', label: formatProfileValue('Male') },
              { value: 'Female', label: formatProfileValue('Female') },
            ]}
          />
        ) : null}
        <AppSelect<LookingForProfileType>
          label={t('edit.lookingFor')}
          value={lookingForProfileType}
          placeholder={t('common.selectOption')}
          cancelLabel={t('common.cancel')}
          error={fieldErrors.lookingForProfileType}
          onChange={(value) => { setLookingForProfileType(value); clearFieldError('lookingForProfileType'); clearFieldError('lookingFor'); clearFieldError('lookingForCoupleType'); }}
          options={[
            { value: 'single', label: formatProfileValue('single') },
            { value: 'couple', label: formatProfileValue('couple') },
            { value: 'both', label: t('edit.bothProfileTypes') },
          ]}
        />
        {lookingForProfileType === 'single' ? (
          <AppSelect
            label={t('edit.lookingForPerson')}
            value={lookingFor}
            placeholder={t('edit.lookingForPlaceholder')}
            cancelLabel={t('common.cancel')}
            error={fieldErrors.lookingFor}
            onChange={(value) => { setLookingFor(value); clearFieldError('lookingFor'); }}
            options={[
              { value: 'Men', label: formatProfileValue('Men') },
              { value: 'Women', label: formatProfileValue('Women') },
              { value: 'Both', label: formatProfileValue('Both') },
            ]}
          />
        ) : null}
        {lookingForProfileType === 'couple' ? (
          <AppSelect
            label={t('edit.lookingForCouple')}
            value={lookingForCoupleType}
            placeholder={t('common.selectOption')}
            cancelLabel={t('common.cancel')}
            error={fieldErrors.lookingForCoupleType}
            onChange={(value) => { setLookingForCoupleType(value); clearFieldError('lookingForCoupleType'); }}
            options={[
              { value: 'woman_man', label: formatProfileValue('woman_man') },
              { value: 'two_women', label: formatProfileValue('two_women') },
              { value: 'two_men', label: formatProfileValue('two_men') },
              { value: 'all', label: formatProfileValue('all') },
            ]}
          />
        ) : null}
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>{t('edit.visibleProfile')}</Text><Text style={styles.switchText}>{t('edit.visibleProfileHint')}</Text></View><Switch value={publicProfile} onValueChange={setPublicProfile} trackColor={{ true: colors.primary }} /></View>
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>{t('edit.publicPhotos')}</Text><Text style={styles.switchText}>{t('edit.publicPhotosHint')}</Text></View><Switch value={publicPhotos} onValueChange={setPublicPhotos} trackColor={{ true: colors.primary }} /></View>
        <AppButton title={t('edit.save')} onPress={() => void save()} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.goldSoft, fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: spacing.sm },
  profileType: { alignSelf: 'flex-start', color: colors.goldSoft, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, fontSize: 13, fontWeight: '800' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  photosInvalid: { padding: spacing.sm, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: -spacing.md, marginBottom: spacing.lg },
  photoWrap: { width: 94, height: 118, position: 'relative' },
  photo: { width: 94, height: 118, borderRadius: radius.md, backgroundColor: colors.surface },
  removePhoto: { position: 'absolute', top: 5, right: 5, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(181, 35, 53, 0.94)', borderWidth: 1, borderColor: colors.white },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold },
  addText: { color: colors.goldSoft, fontSize: 12, marginTop: spacing.xs },
  form: { gap: spacing.md },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, backgroundColor: 'rgba(234,183,106,0.08)' },
  locationButtonPressed: { opacity: 0.78 },
  locationButtonText: { color: colors.goldSoft, fontSize: 14, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.text, fontWeight: '800' },
  switchText: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
