import { useAppTheme } from '@/theme/useAppTheme';
import { Stack } from 'expo-router';

export default function AccountLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
      <Stack.Screen name="two-factor" options={{ title: 'Two-Factor Authentication' }} />
      <Stack.Screen name="sessions" options={{ title: 'Login Activity' }} />
      <Stack.Screen name="api-keys" options={{ title: 'API Keys' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="language-region" options={{ title: 'Language & Region' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="audit-log" options={{ title: 'Audit Log' }} />
      <Stack.Screen name="linked-accounts" options={{ title: 'Linked Accounts' }} />
      <Stack.Screen name="help" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="documentation" options={{ title: 'Documentation' }} />
      <Stack.Screen name="faq" options={{ title: 'FAQ' }} />
      <Stack.Screen name="contact-support" options={{ title: 'Contact Support' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Deactivate Account' }} />
    </Stack>
  );
}
