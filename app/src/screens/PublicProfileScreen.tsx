import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ProfileCompletionModal } from '../components/ProfileCompletionModal';
import { AppButton } from '../components/AppButton';
import { AppField } from '../components/AppField';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';
import type { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;
type ReportReason = 'inappropriate_content' | 'fake_profile' | 'harassment' | 'suspected_underage' | 'spam_or_scam' | 'other';
type ReportReasonTranslationKey = 'profile.reportInappropriate' | 'profile.reportFake' | 'profile.reportHarassment' | 'profile.reportUnderage' | 'profile.reportSpam' | 'profile.reportOther';

export function PublicProfileScreen({ route, navigation }: Props) {
  const { t, formatProfileValue } = useLanguage();
  const { user: currentUser } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [user, setUser] = useState<User | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [profileGalleryIndex, setProfileGalleryIndex] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [error, setError] = useState('');
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportReasonError, setReportReasonError] = useState('');
  const [reportDetailsError, setReportDetailsError] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

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
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
    }
  }, [route.params.userId, t]);

  useEffect(() => { void load(); }, [load]);

  const requestPhotos = async () => {
    if (currentUser?.profileComplete === false) {
      setProfileGateOpen(true);
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/photo-requests', { targetUserId: route.params.userId });
      Alert.alert(t('profile.requestSent'), t('profile.requestSentMessage'));
    } catch (value) {
      Alert.alert(t('profile.requestFailed'), getErrorMessage(value, t('error.generic'), t));
    } finally {
      setActionLoading(false);
    }
  };

  const openReport = () => {
    setReportReason('');
    setReportDetails('');
    setReportReasonError('');
    setReportDetailsError('');
    setReportOpen(true);
  };

  const submitReport = async () => {
    const reasonError = reportReason ? '' : t('validation.required');
    const detailsError = reportReason === 'other' && !reportDetails.trim() ? t('profile.reportOtherRequired') : '';
    setReportReasonError(reasonError);
    setReportDetailsError(detailsError);
    if (reasonError || detailsError || !reportReason) return;

    setReportSubmitting(true);
    try {
      await api.post('/reports', {
        reportedUserId: route.params.userId,
        reason: reportReason,
        details: reportReason === 'other' ? reportDetails.trim() : undefined,
        source: 'profile',
      });
      setReportOpen(false);
      Alert.alert(t('profile.reportReceived'), t('profile.reportThanks'));
    } catch (value) {
      Alert.alert(t('profile.reportFailed'), getErrorMessage(value, t('error.generic'), t));
    } finally {
      setReportSubmitting(false);
    }
  };

  const block = () => Alert.alert(
    t('profile.blockTitle'),
    t('profile.blockMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.block'), style: 'destructive', onPress: () => void (async () => {
          try {
            await api.post('/blocks', { blockedUserId: route.params.userId, source: 'profile' });
            Alert.alert(t('profile.blocked'));
            navigation.navigate('Tabs', { screen: 'Descubrir' });
          } catch (value) {
            Alert.alert(t('profile.blockFailed'), getErrorMessage(value, t('error.generic'), t));
          }
        })(),
      },
    ],
  );

  if (loading) return (
    <Screen contentStyle={styles.center}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={[styles.floatingButton, styles.loadingBack]}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <ActivityIndicator size="large" color={colors.gold} />
    </Screen>
  );
  if (!user) return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.floatingButton}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={styles.error}>{error || t('profile.unavailable')}</Text>
    </Screen>
  );
  const visible = Boolean(user.Profile?.photosVisible || allowed);
  const hasAnyPhotos = Boolean(user.Profile?.photos?.some((photo) => photo?.url));
  const photos = visible ? user.Profile?.photos ?? [] : [];
  const name = user.Profile?.displayName || `${user.firstName} ${user.lastName}`;
  const isCouple = user.Profile?.profileType === 'couple';
  const profileContentWidth = Math.max(windowWidth - (spacing.md * 2), 1);

  const openChat = () => {
    if (currentUser?.profileComplete === false) {
      setProfileGateOpen(true);
      return;
    }
    navigation.navigate('ChatDetail', {
      userId: user.id,
      name,
      avatar: photos[0]?.url,
      initialMessage: t('discover.helloMessage'),
    });
  };

  return (
    <View style={styles.container}>
    <Screen scroll contentStyle={visible || !hasAnyPhotos ? styles.profileContent : styles.profileContentPrivate}>
      <View style={styles.topControls} pointerEvents="box-none">
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.floatingButton}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.safetyMenuAnchor}>
          <Pressable accessibilityRole="button" onPress={() => setSafetyMenuOpen((current) => !current)} style={styles.floatingButton}>
            <Ionicons name={safetyMenuOpen ? 'close' : 'ellipsis-horizontal'} size={25} color={colors.text} />
          </Pressable>
          {safetyMenuOpen ? (
            <View style={styles.safetyMenu}>
              <Pressable onPress={() => { setSafetyMenuOpen(false); openReport(); }} style={styles.safetyMenuItem}>
                <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
                <Text style={styles.safetyMenuText}>{t('profile.report')}</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable onPress={() => { setSafetyMenuOpen(false); block(); }} style={styles.safetyMenuItem}>
                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                <Text style={[styles.safetyMenuText, styles.dangerText]}>{t('profile.block')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
      {photos.length ? (
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            snapToInterval={profileContentWidth}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            style={styles.gallery}
            onMomentumScrollEnd={(event) => setProfileGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / profileContentWidth))}
          >
            {photos.map((photo, index) => (
              <Pressable
                key={`${photo.url}-${index}`}
                accessibilityRole="imagebutton"
                onPress={() => {
                  setGalleryIndex(index);
                  setGalleryOpen(true);
                }}
                style={{ width: profileContentWidth }}
              >
                <Image source={{ uri: photo.url }} style={[styles.photo, { width: profileContentWidth }]} />
              </Pressable>
            ))}
          </ScrollView>
          {photos.length > 1 ? (
            <View style={styles.galleryDots} pointerEvents="none">
              {photos.map((photo, index) => <View key={`${photo.url}-dot-${index}`} style={[styles.galleryDot, index === profileGalleryIndex && styles.galleryDotActive]} />)}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.locked}>
          {hasAnyPhotos && user.Profile?.photos?.[0]?.url ? <Image source={{ uri: user.Profile.photos[0].url }} style={styles.lockedImage} blurRadius={30} /> : null}
          {hasAnyPhotos ? <View style={styles.lockedShade} /> : null}
          <View style={styles.lockedContent}>
            <Ionicons name={hasAnyPhotos ? 'lock-closed' : 'person-circle-outline'} size={48} color={colors.gold} />
            <Text style={styles.lockedTitle}>{t(hasAnyPhotos ? 'profile.privateContent' : 'profile.noPhoto')}</Text>
            <Text style={styles.lockedCopy}>{t(hasAnyPhotos ? 'profile.privateMessage' : 'profile.noPhotoHint')}</Text>
          </View>
        </View>
      )}
      <View style={styles.identity}>
        <View style={styles.identityCopy}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.memberStatus}>{user.Profile?.verified ? t('profile.verified') : t('profile.communityMember')}</Text>
        </View>
        {user.Profile?.verified ? <Ionicons name="checkmark-circle" size={25} color={colors.success} /> : null}
      </View>
      <View style={styles.details}>
        {user.Profile?.address ? <Text style={styles.meta}><Ionicons name="location-outline" /> {user.Profile.address}</Text> : null}
        <Text style={styles.section}>{t(isCouple ? 'profile.aboutCouple' : 'profile.about')}</Text>
        <Text style={styles.description}>{user.Profile?.description || t('profile.noDescription')}</Text>
        <View style={styles.tags}>
          <Text style={styles.tag}>{formatProfileValue(isCouple ? 'couple' : 'single')}</Text>
          {isCouple && user.Profile?.coupleType ? <Text style={styles.tag}>{formatProfileValue(user.Profile.coupleType)}</Text> : null}
          {!isCouple && user.Profile?.gender ? <Text style={styles.tag}>{formatProfileValue(user.Profile.gender)}</Text> : null}
          {user.Profile?.lookingForProfileType === 'both' ? (
            <Text style={styles.tag}>{t('profile.lookingFor', { value: t('edit.bothProfileTypes') })}</Text>
          ) : user.Profile?.lookingForProfileType === 'couple' && user.Profile.lookingForCoupleType ? (
            <>
              <Text style={styles.tag}>{t('profile.lookingFor', { value: formatProfileValue('couple') })}</Text>
              <Text style={styles.tag}>{formatProfileValue(user.Profile.lookingForCoupleType)}</Text>
            </>
          ) : user.Profile?.lookingFor ? (
            <Text style={styles.tag}>{t('profile.lookingFor', { value: formatProfileValue(user.Profile.lookingFor) })}</Text>
          ) : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal visible={galleryOpen} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setGalleryOpen(false)}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.fullscreenGallery}>
          <View style={styles.galleryTopBar}>
            <Text style={styles.galleryCounter}>{galleryIndex + 1} / {photos.length}</Text>
            <Pressable accessibilityRole="button" onPress={() => setGalleryOpen(false)} style={styles.galleryClose}>
              <Ionicons name="close" size={28} color={colors.white} />
            </Pressable>
          </View>
          <FlatList
            key={`fullscreen-gallery-${galleryIndex}-${galleryOpen}`}
            data={photos}
            horizontal
            pagingEnabled
            style={styles.fullscreenList}
            initialScrollIndex={galleryIndex}
            keyExtractor={(photo, index) => `${photo.url}-${index}`}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
            onMomentumScrollEnd={(event) => setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / windowWidth))}
            renderItem={({ item }) => (
              <View style={[styles.fullscreenSlide, { width: windowWidth }]}>
                <Image source={{ uri: item.url }} style={styles.fullscreenImage} resizeMode="contain" />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </Screen>
      <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.messageBar}>
        {!visible && hasAnyPhotos ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.requestPhotos')}
            accessibilityState={{ busy: actionLoading }}
            disabled={actionLoading}
            onPress={() => void requestPhotos()}
            style={({ pressed }) => [styles.requestButton, pressed && styles.messageButtonPressed, actionLoading && styles.buttonDisabled]}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.goldSoft} />
            ) : (
              <>
                <Ionicons name="key-outline" size={21} color={colors.goldSoft} />
                <Text style={styles.requestButtonText}>{t('profile.requestPhotos')}</Text>
              </>
            )}
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.sendMessage')}
          onPress={openChat}
          style={({ pressed }) => [styles.messageButton, pressed && styles.messageButtonPressed]}
        >
          <LinearGradient
            colors={[colors.primary, '#D91D76', '#B71461']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.messageGradient}
          >
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
            <Text style={styles.messageButtonText}>{t('profile.sendMessage')}</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
      <ProfileCompletionModal
        visible={profileGateOpen}
        onClose={() => setProfileGateOpen(false)}
        onEditProfile={() => {
          setProfileGateOpen(false);
          navigation.navigate('EditProfile');
        }}
      />
      <Modal transparent animationType="fade" visible={reportOpen} onRequestClose={() => !reportSubmitting && setReportOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.reportOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} disabled={reportSubmitting} onPress={() => setReportOpen(false)} style={styles.reportBackdrop} />
          <View style={styles.reportSheet}>
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderCopy}>
                <Text style={styles.reportTitle}>{t('profile.reportReasonTitle')}</Text>
                <Text style={styles.reportHint}>{t('profile.reportReasonHint')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} disabled={reportSubmitting} onPress={() => setReportOpen(false)} style={styles.reportClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[styles.reportReasons, Boolean(reportReasonError) && styles.reportReasonsInvalid]}>
                {([
                  ['inappropriate_content', 'profile.reportInappropriate'],
                  ['fake_profile', 'profile.reportFake'],
                  ['harassment', 'profile.reportHarassment'],
                  ['suspected_underage', 'profile.reportUnderage'],
                  ['spam_or_scam', 'profile.reportSpam'],
                  ['other', 'profile.reportOther'],
                ] as Array<[ReportReason, ReportReasonTranslationKey]>).map(([value, label]) => {
                  const selected = reportReason === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        setReportReason(value);
                        setReportReasonError('');
                        if (value !== 'other') {
                          setReportDetails('');
                          setReportDetailsError('');
                        }
                      }}
                      style={({ pressed }) => [styles.reportReason, selected && styles.reportReasonSelected, pressed && styles.reportReasonPressed]}
                    >
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textMuted} />
                      <Text style={[styles.reportReasonText, selected && styles.reportReasonTextSelected]}>{t(label)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {reportReasonError ? <Text style={styles.reportError}>{reportReasonError}</Text> : null}
              {reportReason === 'other' ? (
                <View style={styles.reportDetails}>
                  <AppField
                    label={t('profile.reportOtherLabel')}
                    placeholder={t('profile.reportOtherPlaceholder')}
                    value={reportDetails}
                    error={reportDetailsError}
                    onChangeText={(value) => { setReportDetails(value); setReportDetailsError(''); }}
                    maxLength={1000}
                    multiline
                  />
                </View>
              ) : null}
              <Text style={styles.reportPrivacy}>{t('profile.reportMessage')}</Text>
              <View style={styles.reportActions}>
                <AppButton title={t('common.cancel')} variant="secondary" disabled={reportSubmitting} onPress={() => setReportOpen(false)} style={styles.reportAction} />
                <AppButton title={t('profile.sendReport')} loading={reportSubmitting} onPress={() => void submitReport()} style={styles.reportAction} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileContent: { paddingBottom: 116 },
  profileContentPrivate: { paddingBottom: 184 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingBack: { position: 'absolute', top: spacing.md, left: spacing.md },
  topControls: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, zIndex: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  floatingButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,7,12,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  safetyMenuAnchor: { position: 'relative' },
  safetyMenu: { position: 'absolute', top: 54, right: 0, width: 180, paddingVertical: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, elevation: 12, shadowColor: colors.black, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  safetyMenuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 13 },
  safetyMenuText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  dangerText: { color: colors.danger },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  galleryContainer: { position: 'relative', width: '100%', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface },
  gallery: { width: '100%' },
  photo: { height: 440, borderRadius: radius.lg, backgroundColor: colors.surface },
  galleryDots: { position: 'absolute', left: 0, right: 0, bottom: spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  galleryDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  galleryDotActive: { width: 18, backgroundColor: colors.white },
  locked: { minHeight: 300, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  lockedImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  lockedShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(9,7,12,0.48)' },
  lockedContent: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  lockedTitle: { color: colors.goldSoft, fontSize: 22, fontWeight: '900' },
  lockedCopy: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  identityCopy: { flex: 1 },
  profileName: { color: colors.text, fontSize: 28, fontWeight: '900' },
  memberStatus: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  details: { paddingVertical: spacing.lg, gap: spacing.sm },
  meta: { color: colors.textMuted },
  section: { color: colors.goldSoft, fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: spacing.sm },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  tag: { color: colors.goldSoft, backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  messageBar: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: 'rgba(9,7,12,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  requestButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.gold },
  requestButtonText: { color: colors.goldSoft, fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.58 },
  messageButton: { borderRadius: radius.md, overflow: 'hidden', elevation: 10, shadowColor: colors.primary, shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  messageButtonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  messageGradient: { minHeight: 56, paddingHorizontal: spacing.lg, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  messageButtonText: { color: colors.white, fontSize: 17, fontWeight: '900' },
  error: { color: colors.danger, marginTop: spacing.md },
  fullscreenGallery: { flex: 1, backgroundColor: colors.black },
  fullscreenList: { flex: 1 },
  galleryTopBar: { position: 'absolute', top: spacing.xl, left: spacing.md, right: spacing.md, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  galleryCounter: { color: colors.white, fontSize: 15, fontWeight: '800', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.58)' },
  galleryClose: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  fullscreenSlide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  reportOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  reportBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  reportSheet: { maxHeight: '88%', padding: spacing.lg, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  reportHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  reportHeaderCopy: { flex: 1 },
  reportTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  reportHint: { color: colors.textMuted, lineHeight: 20, marginTop: 4 },
  reportClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  reportReasons: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  reportReasonsInvalid: { borderColor: colors.danger },
  reportReason: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reportReasonSelected: { backgroundColor: 'rgba(245,40,135,0.10)' },
  reportReasonPressed: { opacity: 0.68 },
  reportReasonText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  reportReasonTextSelected: { color: colors.white, fontWeight: '800' },
  reportError: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  reportDetails: { marginTop: spacing.md },
  reportPrivacy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  reportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  reportAction: { flex: 1 },
});
