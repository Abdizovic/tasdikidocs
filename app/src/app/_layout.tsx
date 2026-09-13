import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { useAppTheme } from '@/theme/useAppTheme';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const theme = useAppTheme();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const role = session?.profile.role;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/*
        expo-router's documented mechanism for auth-gated routing is
        Stack.Protected (https://docs.expo.dev/router/advanced/authentication/)
        — a plain JS conditional that adds/removes a Stack.Screen does NOT
        reliably redirect away when the currently-focused screen becomes
        invalid (the router has no signal to reconcile navigation state), so
        signing in would update `session` but leave you stuck on the login
        screen. Stack.Protected's `guard` prop is what the router actually
        watches to redirect.
      */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Protected guard={role === 'institution'}>
          <Stack.Screen name="(institution)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'verifier'}>
          <Stack.Screen name="(verifier)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'admin'}>
          <Stack.Screen name="(admin)" />
        </Stack.Protected>
        <Stack.Screen name="account" />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
      </Stack.Protected>

      <Stack.Screen name="verify/[certId]" options={{ headerShown: true, title: 'Certificate Verification' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
