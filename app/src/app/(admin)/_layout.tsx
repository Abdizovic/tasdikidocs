import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function AdminLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="applications"
        options={{ title: 'Applications', tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="institutions"
        options={{ title: 'Institutions', tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="certificates"
        options={{ title: 'Certificates', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="application/[id]" options={{ href: null }} />
      <Tabs.Screen name="certificate/[id]" options={{ href: null }} />
    </Tabs>
  );
}
