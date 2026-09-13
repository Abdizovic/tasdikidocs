import { Button, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Institution } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const CONFIG: Record<
  Exclude<Institution['status'], 'approved'>,
  { icon: keyof typeof Ionicons.glyphMap; tone: 'warning' | 'danger'; title: string; body: (i: Institution) => string }
> = {
  pending: {
    icon: 'time-outline',
    tone: 'warning',
    title: 'Your application is under review',
    body: () =>
      "A platform administrator is reviewing your institution's application. This usually takes 1-2 business days — you'll be able to issue certificates as soon as you're approved.",
  },
  rejected: {
    icon: 'close-circle-outline',
    tone: 'danger',
    title: 'Application not approved',
    body: (i) => i.rejection_reason ?? 'Your application did not meet our verification requirements.',
  },
  suspended: {
    icon: 'alert-circle-outline',
    tone: 'danger',
    title: 'Account suspended',
    body: (i) => i.rejection_reason ?? 'Your institution account has been suspended by a platform administrator.',
  },
};

export function InstitutionStatusScreen({ institution }: { institution: Institution }) {
  const theme = useAppTheme();
  const { signOut } = useAuth();
  const cfg = CONFIG[institution.status as Exclude<Institution['status'], 'approved'>];
  const fg = theme.colors[cfg.tone];
  const bg = theme.colors[`${cfg.tone}Bg` as 'warningBg' | 'dangerBg'];

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <View style={[styles.circle, { backgroundColor: bg }]}>
          <Ionicons name={cfg.icon} size={36} color={fg} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
          {cfg.title}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{cfg.body(institution)}</Text>

        <View style={[styles.card, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.md }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>Institution</Text>
          <Text style={[styles.cardValue, { color: theme.colors.text }]}>{institution.institution_name}</Text>
          <Text style={[styles.cardLabel, { color: theme.colors.textMuted, marginTop: 10 }]}>
            Registration number
          </Text>
          <Text style={[styles.cardValue, { color: theme.colors.text }]}>{institution.registration_number}</Text>
        </View>

        <Button label="Sign out" variant="outline" onPress={signOut} style={styles.signOutButton} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  circle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 4, maxWidth: 340 },
  card: { width: '100%', maxWidth: 340, padding: 16, marginTop: 28 },
  cardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  signOutButton: { marginTop: 32, maxWidth: 240 },
});
