import { BrandMark } from '@/components/BrandMark';
import { Button, ScreenContainer } from '@/components/ui';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <BrandMark size={72} />
        <Text style={[styles.tagline, { color: theme.colors.textSecondary, fontSize: theme.typography.size.md }]}>
          Tamper-proof academic certificates. Instantly verifiable — no phone calls to the registrar required.
        </Text>
      </View>

      <View style={styles.features}>
        <Feature icon="shield-checkmark-outline" text="Certificates anchored to the blockchain, not a spreadsheet" />
        <Feature icon="qr-code-outline" text="Scan or search to verify authenticity in seconds" />
        <Feature icon="business-outline" text="Only approved, vetted institutions can issue" />
      </View>

      <View style={styles.actions}>
        <Button label="Sign In" onPress={() => router.push('/(auth)/login')} />
        <Button
          label="Create a free verifier account"
          variant="outline"
          onPress={() => router.push('/(auth)/signup')}
        />
        <Link href="/(auth)/institution-apply" style={[styles.link, { color: theme.colors.primary }]}>
          Represent an institution? Apply to issue certificates →
        </Link>
      </View>
    </ScreenContainer>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <Text style={[styles.featureText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  tagline: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  features: {
    gap: 16,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 'auto',
  },
  link: {
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 12,
  },
});
