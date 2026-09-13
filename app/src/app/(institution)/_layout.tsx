import { InstitutionStatusScreen } from '@/components/institution/InstitutionStatusScreen';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function InstitutionLayout() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session?.institution;

  if (!institution || institution.status !== 'approved') {
    return institution ? <InstitutionStatusScreen institution={institution} /> : null;
  }

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
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="certificates"
        options={{ title: 'Certificates', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: 'Team', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="issue-certificate" options={{ href: null }} />
      <Tabs.Screen name="certificate/[id]" options={{ href: null }} />
      <Tabs.Screen name="bulk-issue" options={{ href: null }} />
      <Tabs.Screen name="verification-activity" options={{ href: null }} />
    </Tabs>
  );
}
