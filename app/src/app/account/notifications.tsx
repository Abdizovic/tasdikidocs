import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Card, ScreenContainer } from '@/components/ui';
import { usePreferences, type NotificationPreferences } from '@/context/PreferencesContext';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';

const ROWS: { key: keyof NotificationPreferences; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'email', label: 'Email notifications', description: 'Application status, security alerts', icon: 'mail-outline' },
  { key: 'sms', label: 'SMS notifications', description: 'Critical security alerts only', icon: 'chatbox-outline' },
  { key: 'inApp', label: 'In-app notifications', description: 'Updates while using the app', icon: 'notifications-outline' },
];

export default function NotificationsScreen() {
  const theme = useAppTheme();
  const { notifications, setNotificationPreference } = usePreferences();

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Notifications" description="Choose how TasdikiDocs can reach you." />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[styles.row, index < ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
          >
            <Ionicons name={row.icon} size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.text }]}>{row.label}</Text>
              <Text style={[styles.description, { color: theme.colors.textMuted }]}>{row.description}</Text>
            </View>
            <Switch
              value={notifications[row.key]}
              onValueChange={(value) => setNotificationPreference(row.key, value)}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '600' },
  description: { fontSize: 12, marginTop: 2 },
});
