import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { TabHeaderActions } from '../components/TabHeaderActions';
import { EmptyState } from '../components/EmptyState';
import { ProfileCompletionModal } from '../components/ProfileCompletionModal';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors, radius, spacing } from '../theme/colors';
import type { User } from '../types/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type Navigation = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Descubrir'>, NativeStackNavigationProp<RootStackParamList>>;

function ageFromDate(value?: string | null) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
}

export function DiscoverScreen({ navigation }: { navigation: Navigation }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [liking, setLiking] = useState(false);
  const [requestingPhotoUserId, setRequestingPhotoUserId] = useState<string | null>(null);
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionHasMore, setDescriptionHasMore] = useState(false);
  const usersRef = useRef<User[]>([]);
  const indexRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data } = await api.get<User[]>('/profiles');
      setUsers(Array.isArray(data) ? data : []);
      setIndex(0);
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const synchronizeProfiles = useCallback(async () => {
    try {
      const { data } = await api.get<User[]>('/profiles');
      const incoming = Array.isArray(data) ? data : [];
      const incomingById = new Map(incoming.map((profile) => [profile.id, profile]));
      const currentUsers = usersRef.current;
      const currentUserId = currentUsers[indexRef.current]?.id;
      const retained = currentUsers
        .filter((profile) => incomingById.has(profile.id))
        .map((profile) => incomingById.get(profile.id) as User);
      const retainedIds = new Set(retained.map((profile) => profile.id));
      const merged = [...retained, ...incoming.filter((profile) => !retainedIds.has(profile.id))];
      const currentPosition = currentUserId ? merged.findIndex((profile) => profile.id === currentUserId) : -1;
      const nextIndex = currentPosition >= 0 ? currentPosition : Math.min(indexRef.current, Math.max(merged.length - 1, 0));

      usersRef.current = merged;
      indexRef.current = nextIndex;
      setUsers(merged);
      setIndex(nextIndex);
    } catch {
      // Pull to Refresh remains available if a background synchronization fails.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(useCallback(() => {
    if (!loading) void synchronizeProfiles();
  }, [loading, synchronizeProfiles]));
  const user = users[index];
  const profileName = user?.Profile?.displayName || (user ? `${user.firstName} ${user.lastName}` : '');
  const description = user?.Profile?.description || t('discover.defaultDescription');
  const canViewPhotos = Boolean(user?.Profile?.photosVisible || user?.canViewPrivatePhotos);

  useEffect(() => {
    usersRef.current = users;
    indexRef.current = index;
  }, [index, users]);

  useEffect(() => {
    let active = true;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleSynchronization = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void synchronizeProfiles(); }, 250);
    };

    void getSocket().then((socket) => {
      if (!active) return;
      activeSocket = socket;
      socket.on('discoverProfilesChanged', scheduleSynchronization);
    }).catch(() => undefined);

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      activeSocket?.off('discoverProfilesChanged', scheduleSynchronization);
    };
  }, [synchronizeProfiles]);

  useEffect(() => {
    setDescriptionExpanded(false);
    setDescriptionHasMore(false);
  }, [user?.id]);

  const next = () => setIndex((current) => Math.min(current + 1, users.length));
  const openChat = () => {
    if (currentUser?.profileComplete === false) {
      setProfileGateOpen(true);
      return;
    }
    if (!user) return;
    navigation.navigate('ChatDetail', {
      userId: user.id,
      name: profileName,
      avatar: canViewPhotos ? user.Profile?.photos?.[0]?.url : null,
      initialMessage: t('discover.helloMessage'),
    });
  };
  const requestPhotoAccess = async () => {
    if (currentUser?.profileComplete === false) {
      setProfileGateOpen(true);
      return;
    }
    if (!user || requestingPhotoUserId || user.photoRequestStatus === 'pending') return;
    setRequestingPhotoUserId(user.id);
    setError('');
    try {
      await api.post('/photo-requests', { targetUserId: user.id });
      const updatedUsers = usersRef.current.map((profile) => (
        profile.id === user.id ? { ...profile, photoRequestStatus: 'pending' as const } : profile
      ));
      usersRef.current = updatedUsers;
      setUsers(updatedUsers);
    } catch (value) {
      setError(getErrorMessage(value, t('discover.requestPhotosFailed'), t));
      void synchronizeProfiles();
    } finally {
      setRequestingPhotoUserId(null);
    }
  };
  const like = async () => {
    if (currentUser?.profileComplete === false) {
      setProfileGateOpen(true);
      return;
    }
    if (!user || liking) return;
    setLiking(true);
    try {
      await api.post('/likes', { likedUserId: user.id });
      await new Promise((resolve) => setTimeout(resolve, 350));
      next();
    } catch (value) {
      setError(getErrorMessage(value, t('error.generic'), t));
    } finally {
      setLiking(false);
    }
  };

  if (loading) return <Screen contentStyle={styles.center}><ActivityIndicator size="large" color={colors.gold} /></Screen>;

  return (
    <Screen
      scroll
      contentStyle={styles.screen}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.gold}
          colors={[colors.gold]}
          progressBackgroundColor={colors.surface}
        />
      )}
    >
      <Header
        title={t('discover.title')}
        subtitle={t('discover.subtitle')}
        action={<TabHeaderActions />}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!user ? (
        <EmptyState icon="sparkles-outline" title={t('discover.emptyTitle')} message={t('discover.emptyMessage')} />
      ) : (
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={user.Profile?.displayName || `${user.firstName} ${user.lastName}`}
              onPress={() => navigation.navigate('Profile', { userId: user.id })}
              style={[styles.photoButton, descriptionExpanded && styles.photoButtonExpanded]}
            >
              {canViewPhotos && user.Profile?.photos?.[0]?.url ? (
                <Image source={{ uri: user.Profile.photos[0].url }} style={[styles.photo, descriptionExpanded && styles.photoExpanded]} />
              ) : user.Profile?.photos?.[0]?.url ? (
                <View style={[styles.photo, descriptionExpanded && styles.photoExpanded]}>
                  <Image source={{ uri: user.Profile.photos[0].url }} style={styles.privateImage} blurRadius={28} />
                  <View style={styles.privateShade} />
                  <View style={styles.privatePhoto}>
                    <Ionicons name="lock-closed" size={42} color={colors.gold} />
                    <Text style={styles.privateTitle}>{t('discover.privatePhotos')}</Text>
                    <Text style={styles.privateCopy}>{t('discover.requestHint')}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: user.photoRequestStatus === 'pending', busy: requestingPhotoUserId === user.id }}
                      disabled={user.photoRequestStatus === 'pending' || requestingPhotoUserId === user.id}
                      onPress={(event) => { event.stopPropagation(); void requestPhotoAccess(); }}
                      style={[styles.privateRequestButton, user.photoRequestStatus === 'pending' && styles.privateRequestButtonSent]}
                    >
                      {requestingPhotoUserId === user.id ? (
                        <ActivityIndicator size="small" color={colors.black} />
                      ) : (
                        <Ionicons name={user.photoRequestStatus === 'pending' ? 'checkmark' : 'key-outline'} size={17} color={colors.black} />
                      )}
                      <Text style={styles.privateRequestText}>{t(
                        requestingPhotoUserId === user.id
                          ? 'discover.requestingPhotos'
                          : user.photoRequestStatus === 'pending' ? 'discover.requestSent' : 'discover.requestPhotos'
                      )}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={[styles.photo, descriptionExpanded && styles.photoExpanded, styles.privatePhoto]}>
                  <Ionicons name="lock-closed" size={42} color={colors.gold} />
                  <Text style={styles.privateTitle}>{t('discover.privatePhotos')}</Text>
                  <Text style={styles.privateCopy}>{t('discover.requestHint')}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('Profile', { userId: user.id })}
                  hitSlop={6}
                  style={styles.nameButton}
                >
                  <Text style={styles.name}>{user.Profile?.displayName || `${user.firstName} ${user.lastName}`}</Text>
                </Pressable>
                {user.Profile?.profileType !== 'couple' && ageFromDate(user.Profile?.birthDate) ? <Text style={styles.age}>{ageFromDate(user.Profile?.birthDate)}</Text> : null}
                {user.Profile?.verified ? <Ionicons name="checkmark-circle" size={21} color={colors.success} /> : null}
              </View>
              {user.Profile?.address ? <Text style={styles.location}><Ionicons name="location-outline" /> {user.Profile.address}</Text> : null}
              <View style={styles.descriptionArea}>
                <Text
                  pointerEvents="none"
                  style={[styles.description, styles.descriptionMeasure]}
                  onTextLayout={(event) => setDescriptionHasMore(event.nativeEvent.lines.length > 2)}
                >
                  {description}
                </Text>
                {descriptionExpanded ? (
                  <ScrollView
                    style={styles.expandedDescription}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    persistentScrollbar
                    onTouchStart={(event) => event.stopPropagation()}
                  >
                    <Text style={styles.description}>{description}</Text>
                  </ScrollView>
                ) : (
                  <Text style={styles.description} numberOfLines={2}>{description}</Text>
                )}
                {descriptionHasMore ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={(event) => { event.stopPropagation(); setDescriptionExpanded((current) => !current); }}
                    hitSlop={6}
                  >
                    <Text style={styles.descriptionToggle}>{t(descriptionExpanded ? 'discover.showLess' : 'discover.showMore')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={next} style={[styles.action, styles.skip]}><Ionicons name="close" size={30} color={colors.textMuted} /></Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('discover.sayHello')}
              onPress={openChat}
              style={styles.helloAction}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={21} color={colors.goldSoft} />
              <Text style={styles.helloActionText}>{t('discover.sayHello')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: liking, selected: liking }}
              onPress={like}
              disabled={liking}
              style={[styles.action, styles.like, liking && styles.likeActive]}
            >
              <Ionicons name="heart" size={28} color={liking ? '#FF304F' : '#77727B'} />
            </Pressable>
          </View>
        </View>
      )}
      <ProfileCompletionModal
        visible={profileGateOpen}
        onClose={() => setProfileGateOpen(false)}
        onEditProfile={() => {
          setProfileGateOpen(false);
          navigation.navigate('EditProfile');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { minHeight: 0, paddingBottom: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, marginBottom: spacing.md },
  card: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardContent: { flex: 1, minHeight: 0 },
  photoButton: { flex: 1, minHeight: 150 },
  photoButtonExpanded: { minHeight: 70 },
  photo: { flex: 1, minHeight: 150, width: '100%', backgroundColor: colors.surfaceRaised },
  photoExpanded: { minHeight: 70 },
  privateImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  privateShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(9,7,12,0.42)' },
  privatePhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  privateTitle: { color: colors.goldSoft, fontSize: 20, fontWeight: '900' },
  privateCopy: { color: colors.textMuted },
  privateRequestButton: { minHeight: 40, marginTop: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.gold },
  privateRequestButtonSent: { backgroundColor: colors.success },
  privateRequestText: { color: colors.black, fontSize: 13, fontWeight: '900' },
  info: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameButton: { flexShrink: 1 },
  name: { flexShrink: 1, color: colors.text, fontSize: 22, fontWeight: '900' },
  age: { color: colors.goldSoft, fontSize: 20 },
  location: { color: colors.textMuted },
  description: { color: colors.text, lineHeight: 19 },
  descriptionArea: { position: 'relative' },
  descriptionMeasure: { position: 'absolute', left: 0, right: 0, opacity: 0, zIndex: -1 },
  expandedDescription: { maxHeight: 128 },
  descriptionToggle: { alignSelf: 'flex-start', color: colors.goldSoft, fontSize: 13, fontWeight: '800', marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  action: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  skip: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  helloAction: { height: 48, paddingHorizontal: spacing.md, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.gold },
  helloActionText: { color: colors.goldSoft, fontSize: 14, fontWeight: '900' },
  like: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#DDD8DF', elevation: 4, shadowColor: colors.black, shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  likeActive: { borderColor: '#FF304F' },
});
