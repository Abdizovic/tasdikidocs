import { BrandMark } from '@/components/BrandMark';
import { CertificateCard } from '@/components/certificates/CertificateCard';
import { Card, ScreenContainer } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { verifyCertificateById } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { VerificationResponse } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Public, no-login-required verification page. This is what a certificate's
// QR code / share link resolves to for anyone without the app installed —
// Expo Router's static web export makes this a real, crawlable, indexable
// URL per certificate (see app.json web.output: "static"), not just an
// in-app deep link.

const RESULT_CONFIG = {
  valid: { icon: 'shield-checkmark' as const, tone: 'success' as const, title: 'Certificate is valid' },
  revoked: { icon: 'close-circle' as const, tone: 'danger' as const, title: 'Certificate has been revoked' },
  invalid: { icon: 'alert-circle' as const, tone: 'danger' as const, title: 'Certificate is invalid' },
  not_found: { icon: 'help-circle' as const, tone: 'warning' as const, title: 'No matching certificate found' },
};

export default function PublicVerifyScreen() {
  const theme = useAppTheme();
  const { certId } = useLocalSearchParams<{ certId: string }>();
  const [response, setResponse] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    verifyCertificateById(certId).then(setResponse);
  }, [certId]);

  const cert = response?.certificate;
  const seoTitle = cert
    ? `${cert.student_name} — ${response!.result === 'valid' ? 'Verified' : 'Revoked'} Certificate | TasdikiDocs`
    : 'Certificate Verification | TasdikiDocs';
  const seoDescription = cert
    ? `${cert.course_name} certificate issued by ${cert.institution_name}. Verified on the blockchain via TasdikiDocs.`
    : 'Instantly verify the authenticity of a blockchain-issued academic certificate.';

  return (
    <ScreenContainer>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta name="robots" content="index, follow" />
      </Head>

      <View style={styles.brandRow}>
        <BrandMark size={40} />
      </View>

      {!response ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.primary} />
      ) : (
        <PublicResult response={response} />
      )}
    </ScreenContainer>
  );
}

function PublicResult({ response }: { response: VerificationResponse }) {
  const theme = useAppTheme();
  const cfg = RESULT_CONFIG[response.result];
  const fg = theme.colors[cfg.tone];
  const bg = theme.colors[`${cfg.tone}Bg` as 'successBg' | 'dangerBg' | 'warningBg'];
  const cert = response.certificate;

  return (
    <View>
      <View style={styles.resultHeader}>
        <View style={[styles.circle, { backgroundColor: bg }]}>
          <Ionicons name={cfg.icon} size={44} color={fg} />
        </View>
        <Text style={[styles.title, { color: fg, fontSize: theme.typography.size.xl }]}>{cfg.title}</Text>
      </View>

      {cert ? (
        <>
          <CertificateCard certificate={cert} />
          {cert.status === 'revoked' && cert.revoked_at ? (
            <Card style={styles.revokedNote}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Revoked on</Text>
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{formatDateTime(cert.revoked_at)}</Text>
            </Card>
          ) : null}
        </>
      ) : (
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
          Double-check the link or ask the certificate holder for the correct verification code.
        </Text>
      )}

      <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
        Verified independently of the issuing institution via TasdikiDocs.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  resultHeader: { alignItems: 'center', gap: 6, marginBottom: 24 },
  circle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontWeight: '800', textAlign: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  revokedNote: { marginTop: 14 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
