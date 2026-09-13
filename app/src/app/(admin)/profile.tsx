import { AccountMenuRow } from '@/components/account/AccountMenuRow';
import { AccountMenuSection } from '@/components/account/AccountMenuSection';
import { DownloadReportRow } from '@/components/account/DownloadReportRow';
import { Button, Card, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDate, initials } from '@/lib/format';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

const PERMISSIONS = [
  'Approve or reject institution applications',
  'Suspend and reinstate institutions',
  'View platform-wide analytics',
  'View the full audit log',
];

export default function AdminProfileScreen() {
  const theme = useAppTheme();
  const { session, signOut } = useAuth();
  const { profile } = session!;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryDark }]}>
            <Text style={styles.avatarText}>{initials(profile.full_name)}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
          {profile.full_name}
        </Text>
        <Text style={{ color: theme.colors.textSecondary }}>{profile.email}</Text>
        <Text style={[styles.memberSince, { color: theme.colors.textMuted }]}>
          Member since {formatDate(profile.created_at)}
        </Text>
      </View>

      <Card style={{ marginBottom: 20 }}>
        <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>Account type</Text>
        <Text style={[styles.cardValue, { color: theme.colors.text }]}>Platform Administrator</Text>
        <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
          This account was seeded directly in the database — there is no public signup path for admin accounts.
        </Text>

        <View style={styles.permissionsList}>
          {PERMISSIONS.map((p) => (
            <View key={p} style={styles.permissionRow}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={[styles.permissionText, { color: theme.colors.text }]}>{p}</Text>
            </View>
          ))}
        </View>
      </Card>

      <AccountMenuSection title="Account">
        <AccountMenuRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/account/edit-profile')} isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Security">
        <AccountMenuRow icon="key-outline" label="Change Password" onPress={() => router.push('/account/change-password')} />
        <AccountMenuRow icon="shield-checkmark-outline" label="Two-Factor Authentication" onPress={() => router.push('/account/two-factor')} />
        <AccountMenuRow icon="phone-portrait-outline" label="Login Activity" onPress={() => router.push('/account/sessions')} />
        <AccountMenuRow icon="code-slash-outline" label="API Keys" onPress={() => router.push('/account/api-keys')} isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Preferences">
        <AccountMenuRow icon="color-palette-outline" label="Appearance" onPress={() => router.push('/account/appearance')} />
        <AccountMenuRow icon="language-outline" label="Language & Region" onPress={() => router.push('/account/language-region')} />
        <AccountMenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/account/notifications')} isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Activity">
        <AccountMenuRow icon="receipt-outline" label="Audit Log" onPress={() => router.push('/account/audit-log')} />
        <AccountMenuRow icon="link-outline" label="Linked Accounts" onPress={() => router.push('/account/linked-accounts')} isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Reports">
        <DownloadReportRow isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Support">
        <AccountMenuRow icon="help-circle-outline" label="Help & Support" onPress={() => router.push('/account/help')} isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Danger Zone">
        <AccountMenuRow icon="trash-outline" label="Deactivate Account" onPress={() => router.push('/account/delete-account')} danger isLast />
      </AccountMenuSection>

      <Button label="Sign out" variant="outline" onPress={signOut} style={{ marginTop: 4, marginBottom: 24 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 4, marginBottom: 24, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarImage: { width: 72, height: 72, borderRadius: 36, marginBottom: 8 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { fontWeight: '800' },
  memberSince: { fontSize: 12, marginTop: 4 },
  cardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  cardDescription: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  permissionsList: { marginTop: 14, gap: 8 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  permissionText: { fontSize: 13, flex: 1 },
});
