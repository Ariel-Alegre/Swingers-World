import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { LikesScreen } from '../screens/LikesScreen';
import { RequestsScreen } from '../screens/RequestsScreen';
import { ChatsScreen } from '../screens/ChatsScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { colors } from '../theme/colors';
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  Descubrir: 'compass-outline',
  Favoritos: 'heart-outline',
  Solicitudes: 'key-outline',
  Chats: 'chatbubbles-outline',
  Cuenta: 'person-circle-outline',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons[route.name]} color={color} size={size} />,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Descubrir" component={DiscoverScreen} />
      <Tab.Screen name="Favoritos" component={LikesScreen} />
      <Tab.Screen name="Solicitudes" component={RequestsScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Cuenta" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
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
        <AuthStack.Screen name="Legal" component={LegalScreen} options={{ headerShown: true, title: 'Información legal', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      </AuthStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
      <RootStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen name="Profile" component={PublicProfileScreen} options={{ title: 'Perfil' }} />
      <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Editar perfil' }} />
      <RootStack.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params.name })} />
      <RootStack.Screen name="Legal" component={LegalScreen} options={{ title: 'Información legal' }} />
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.background },
  logo: { width: 140, height: 140, borderRadius: 32 },
  tabBar: { height: 68, paddingTop: 7, paddingBottom: 8, backgroundColor: colors.surface, borderTopColor: colors.border },
  tabLabel: { fontSize: 10, fontWeight: '700' },
});
