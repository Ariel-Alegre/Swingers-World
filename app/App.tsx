import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PushNotificationManager } from './src/components/PushNotificationManager';
import { colors } from './src/theme/colors';
import { navigationRef } from './src/lib/navigation';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <AuthProvider>
            <SubscriptionProvider>
              <StatusBar style="light" />
              <PushNotificationManager />
              <RootNavigator />
            </SubscriptionProvider>
          </AuthProvider>
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
