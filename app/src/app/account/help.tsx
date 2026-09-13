import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { AccountMenuRow } from '@/components/account/AccountMenuRow';
import { AccountMenuSection } from '@/components/account/AccountMenuSection';
import { ScreenContainer } from '@/components/ui';
import { useAppTheme } from '@/theme/useAppTheme';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HelpScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Help & Support" />

      <AccountMenuSection title="Resources">
        <AccountMenuRow icon="book-outline" label="Documentation" subtitle="How verification, issuing, and approval work" onPress={() => router.push('/account/documentation')} />
        <AccountMenuRow icon="help-circle-outline" label="Frequently Asked Questions" onPress={() => router.push('/account/faq')} />
        <AccountMenuRow icon="mail-outline" label="Contact Support" subtitle="Send us a message, we'll reply by email" onPress={() => router.push('/account/contact-support')} isLast />
      </AccountMenuSection>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: theme.colors.textMuted }]}>TasdikiDocs v1.0.0</Text>
        <Text style={[styles.version, { color: theme.colors.textMuted }]}>Mock-data build — not yet connected to Supabase</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', marginTop: 32, gap: 4 },
  version: { fontSize: 12 },
});
