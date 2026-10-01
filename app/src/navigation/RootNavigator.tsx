import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { LikesScreen } from '../screens/LikesScreen';
import { ReceivedLikesScreen } from '../screens/ReceivedLikesScreen';
import { SentPhotoRequestsScreen } from '../screens/SentPhotoRequestsScreen';
import { BlockedUsersScreen } from '../screens/BlockedUsersScreen';
import { RequestsScreen } from '../screens/RequestsScreen';
import { ChatsScreen } from '../screens/ChatsScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { ArchivedChatsScreen } from '../screens/ArchivedChatsScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { LocationSync } from '../components/LocationSync';
import { RealtimeConnection } from '../components/RealtimeConnection';
import { ProfileCompletionModal } from '../components/ProfileCompletionModal';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors } from '../theme/colors';
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  Descubrir: 'compass-outline',
  Solicitudes: 'key-outline',
  Chats: 'chatbubbles-outline',
  Cuenta: 'person-circle-outline',
};

type MainTabsProps = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

function MainTabs({ navigation }: MainTabsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [completionModalDismissed, setCompletionModalDismissed] = useState(false);

  useEffect(() => {
    setCompletionModalDismissed(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> | null = null;

    const updateUnreadCount = ({ count }: { count: number }) => setUnreadMessageCount(Number(count) || 0);

    void api.get<Array<{ count: number | string }>>('/unread-message-counts')
      .then(({ data }) => {
        if (!active) return;
        const total = Array.isArray(data) ? data.reduce((sum, item) => sum + (Number(item.count) || 0), 0) : 0;
        setUnreadMessageCount(total);
      })
      .catch(() => undefined);

    void getSocket().then((socket) => {
      if (!active) return;
      activeSocket = socket;
      socket.on('unreadMessages', updateUnreadCount);
    }).catch(() => undefined);

    return () => {
      active = false;
      activeSocket?.off('unreadMessages', updateUnreadCount);
    };
  }, [user?.id]);

  return (
    <>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <View style={[styles.tabIcon, { width: size, height: size }]}>
            <Ionicons name={tabIcons[route.name]} color={color} size={size} />
            {route.name === 'Chats' && unreadMessageCount > 0 ? <View style={styles.unreadDot} /> : null}
          </View>
        ),
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Descubrir" component={DiscoverScreen} options={{ tabBarLabel: t('nav.discover') }} />
      <Tab.Screen name="Solicitudes" component={RequestsScreen} options={{ tabBarLabel: t('nav.requests') }} />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{ tabBarLabel: t('nav.chats') }}
      />
      <Tab.Screen name="Cuenta" component={AccountScreen} options={{ tabBarLabel: t('nav.account') }} />
    </Tab.Navigator>
      <ProfileCompletionModal
        visible={user?.profileComplete === false && !completionModalDismissed}
        onClose={() => setCompletionModalDismissed(true)}
        onEditProfile={() => {
          setCompletionModalDismissed(true);
          navigation.navigate('EditProfile');
        }}
      />
    </>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { loading: languageLoading, t } = useLanguage();

  if (loading || languageLoading) {
    return (
      <View style={styles.loading}>
        <Image source={require('../../assets/swingers-world.png')} style={styles.logo} />
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
        <AuthStack.Screen name="Legal" component={LegalScreen} options={{ headerShown: true, title: t('nav.legal'), headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      </AuthStack.Navigator>
    );
  }

  return (
    <>
      <LocationSync />
      <RealtimeConnection />
      <RootStack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
        <RootStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="Profile" component={PublicProfileScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="InterestedProfiles" component={LikesScreen} options={{ title: t('favorites.title') }} />
        <RootStack.Screen name="ReceivedLikes" component={ReceivedLikesScreen} options={{ title: t('receivedLikes.title') }} />
        <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: t('blockedUsers.title') }} />
        <RootStack.Screen name="SentPhotoRequests" component={SentPhotoRequestsScreen} options={{ title: t('sentRequests.title') }} />
        <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('nav.editProfile') }} />
        <RootStack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="ArchivedChats" component={ArchivedChatsScreen} options={{ title: t('chats.archivedTitle') }} />
        <RootStack.Screen name="Legal" component={LegalScreen} options={{ title: t('nav.legal') }} />
      </RootStack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.background },
  logo: { width: 140, height: 140, borderRadius: 32 },
  tabBar: { height: 68, paddingTop: 7, paddingBottom: 8, backgroundColor: colors.surface, borderTopColor: colors.border },
  tabLabel: { fontSize: 10, fontWeight: '700' },
  tabIcon: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  unreadDot: { position: 'absolute', top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface },
});
