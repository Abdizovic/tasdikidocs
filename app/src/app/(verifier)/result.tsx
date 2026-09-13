import { CertificateCard } from '@/components/certificates/CertificateCard';
import { Button, Card, ScreenContainer } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { verifyCertificateById } from '@/lib/mockApi';
import { addHistoryEntry } from '@/lib/verificationHistory';
import { useAppTheme } from '@/theme/useAppTheme';
import type { VerificationResponse } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';

const RESULT_CONFIG = {
  valid: {
    icon: 'shield-checkmark' as const,
    tone: 'success' as const,
    title: 'Certificate is valid',
    body: 'This certificate was issued by an approved institution and has not been revoked.',
  },
  revoked: {
    icon: 'close-circle' as const,
    tone: 'danger' as const,
    title: 'Certificate has been revoked',
    body: 'This certificate was issued but has since been revoked by the issuing institution. Do not treat it as valid.',
  },
  invalid: {
    icon: 'alert-circle' as const,
    tone: 'danger' as const,
    title: 'Certificate is invalid',
    body: 'This record does not match a certificate we recognize.',
  },
  not_found: {
    icon: 'help-circle' as const,
    tone: 'warning' as const,
    title: 'No matching certificate found',
    body: 'Double-check the ID or registration number and try again.',
  },
};

export default function ResultScreen() {
  const theme = useAppTheme();
  const { query } = useLocalSearchParams<{ query: string }>();
  const [response, setResponse] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    verifyCertificateById(query).then((res) => {
      if (cancelled) return;
      setResponse(res);
      addHistoryEntry({
        query,
        result: res.result,
        studentName: res.certificate?.student_name ?? null,
        checkedAt: new Date().toISOString(),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!response) {
    return (
      <ScreenContainer scroll={false}>
        <Stack.Screen options={{ headerShown: true, title: 'Verifying…' }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const cfg = RESULT_CONFIG[response.result];
  const fg = theme.colors[cfg.tone];
  const bg = theme.colors[`${cfg.tone}Bg` as 'successBg' | 'dangerBg' | 'warningBg'];
  const cert = response.certificate;

  async function handleShare() {
    const summary = cert
      ? `TasdikiDocs verification: ${cert.student_name}'s ${cert.course_name} certificate from ${cert.institution_name} is ${response!.result.toUpperCase()}.`
      : `TasdikiDocs verification: "${query}" was not found.`;
    await Share.share({ message: summary });
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Verification Result' }} />
      <View style={styles.resultHeader}>
        <View style={[styles.circle, { backgroundColor: bg }]}>
          <Ionicons name={cfg.icon} size={44} color={fg} />
        </View>
        <Text style={[styles.title, { color: fg, fontSize: theme.typography.size.xl }]}>{cfg.title}</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{cfg.body}</Text>
      </View>

      {cert ? (
        <>
          <CertificateCard certificate={cert} />
          {cert.status === 'revoked' && cert.revoked_at ? (
            <Card style={styles.revokedNote}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Revoked on</Text>
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{formatDateTime(cert.revoked_at)}</Text>
              {cert.revoked_reason ? (
                <Text style={[styles.revokedReason, { color: theme.colors.textSecondary }]}>{cert.revoked_reason}</Text>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}

      <View style={styles.actions}>
        {cert ? <Button label="Share result" variant="outline" onPress={handleShare} /> : null}
        <Button label="Verify another certificate" onPress={() => router.replace('/(verifier)/home')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultHeader: { alignItems: 'center', gap: 6, marginBottom: 24, marginTop: 8 },
  circle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  revokedNote: { marginTop: 14 },
  revokedReason: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  actions: { gap: 12, marginTop: 24 },
});
