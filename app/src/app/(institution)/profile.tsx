import { AccountMenuRow } from '@/components/account/AccountMenuRow';
import { AccountMenuSection } from '@/components/account/AccountMenuSection';
import { DownloadReportRow } from '@/components/account/DownloadReportRow';
import { Button, Card, ScreenContainer, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDate, initials } from '@/lib/format';
import { useAppTheme } from '@/theme/useAppTheme';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function InstitutionProfileScreen() {
  const theme = useAppTheme();
  const { session, signOut } = useAuth();
  const { profile, institution } = session!;

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

      <Card style={{ gap: 14, marginBottom: 20 }}>
        <Row label="Institution" value={institution!.institution_name} theme={theme} />
        <Row label="Registration number" value={institution!.registration_number} theme={theme} />
        <Row label="Country" value={institution!.country} theme={theme} />
        {institution!.website ? <Row label="Website" value={institution!.website} theme={theme} /> : null}
        <View>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Status</Text>
          <View style={{ marginTop: 4 }}>
            <StatusBadge status={institution!.status as 'approved'} />
          </View>
        </View>
      </Card>

      <AccountMenuSection title="Account">
        <AccountMenuRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/account/edit-profile')} isLast />
      </AccountMenuSection>

      <AccountMenuSection title="Security">
        <AccountMenuRow icon="key-outline" label="Change Password" onPress={() => router.push('/account/change-password')} />
        <AccountMenuRow icon="shield-checkmark-outline" label="Two-Factor Authentication" onPress={() => router.push('/account/two-factor')} />
        <AccountMenuRow icon="phone-portrait-outline" label="Login Activity" onPress={() => router.push('/account/sessions')} isLast />
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

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 4, marginBottom: 24, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarImage: { width: 72, height: 72, borderRadius: 36, marginBottom: 8 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { fontWeight: '800' },
  memberSince: { fontSize: 12, marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, fontWeight: '600', marginTop: 3 },
});
