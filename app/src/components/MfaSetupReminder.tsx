import { Card } from '@/components/ui';
import { listMfaFactors } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Nudges institution/admin accounts to enable two-factor authentication —
 * they can issue certificates or approve institutions, so it's strongly
 * encouraged, but deliberately not a hard login gate (a lost authenticator
 * with no recovery-code flow would otherwise permanently lock someone out
 * of the single seeded admin account, or an institution's own account).
 */
export function MfaSetupReminder() {
  const theme = useAppTheme();
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    listMfaFactors()
      .then((factors) => setNeedsSetup(!factors.some((f) => f.status === 'verified')))
      .catch(() => {});
  }, []);

  if (!needsSetup) return null;

  return (
    <Pressable onPress={() => router.push('/account/two-factor')}>
      <Card style={[styles.card, { borderColor: theme.colors.warning, backgroundColor: theme.colors.warningBg }]}>
        <Ionicons name="shield-outline" size={22} color={theme.colors.warningDark} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.warningDark }]}>Set up two-factor authentication</Text>
          <Text style={[styles.body, { color: theme.colors.warningDark }]}>
            Recommended for accounts that can issue certificates or approve institutions.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.warningDark} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: { fontSize: 13, fontWeight: '700' },
  body: { fontSize: 12, lineHeight: 16, marginTop: 2 },
});
