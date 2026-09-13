import { BrandMark } from '@/components/BrandMark';
import { NotificationBell } from '@/components/NotificationBell';
import { Card, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function VerifierHomeScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.bellRow}>
        <NotificationBell />
      </View>

      <View style={styles.header}>
        <BrandMark size={48} showWordmark={false} />
        <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Hello, {session?.profile.full_name.split(' ')[0]}</Text>
        <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
          Verify a certificate
        </Text>
      </View>

      <Pressable onPress={() => router.push('/(verifier)/scan')}>
        <Card style={styles.actionCard}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Ionicons name="qr-code-outline" size={26} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Scan QR code</Text>
            <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
              Point your camera at the certificate’s QR code
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/(verifier)/search')}>
        <Card style={styles.actionCard}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Ionicons name="search-outline" size={26} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Search by ID</Text>
            <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
              Enter a certificate ID or registration number
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </Card>
      </Pressable>

      <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
        Try registration number “NIT/CS/2021/0456” (valid) or “NIT/EE/2019/0087” (revoked) with the seeded demo data.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bellRow: { alignItems: 'flex-end' },
  header: { alignItems: 'center', gap: 4, marginBottom: 28, marginTop: -4 },
  greeting: { fontSize: 14, marginTop: 8 },
  title: { fontWeight: '800' },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionSubtitle: { fontSize: 13, marginTop: 3 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
