import { CertificateCard } from '@/components/certificates/CertificateCard';
import { Button, Card, InlineAlert, ScreenContainer, StatusBadge, TextField } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { formatDateTime, truncateMiddle } from '@/lib/format';
import { listAllCertificates, revokeCertificate } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AdminCertificateDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null | undefined>(undefined);
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listAllCertificates().then((list) => setCertificate(list.find((c) => c.id === id) ?? null));
  }, [id]);

  async function handleRevoke() {
    setError(null);
    if (!reason.trim()) {
      setError('Please provide a reason for revocation — this is recorded in the audit log.');
      return;
    }
    setLoading(true);
    try {
      const updated = await revokeCertificate(id, reason.trim());
      setCertificate(updated);
      setShowRevokeForm(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (certificate === undefined) {
    return (
      <ScreenContainer scroll={false}>
        <Stack.Screen options={{ headerShown: true, title: 'Certificate' }} />
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (certificate === null) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: 'Certificate' }} />
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Not found.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: certificate.student_name }} />

      <View style={styles.statusRow}>
        <StatusBadge status={certificate.status} />
      </View>

      <CertificateCard certificate={certificate} />

      <Card style={{ gap: 14, marginTop: 20 }}>
        <Field label="Institution" value={certificate.institution_name} theme={theme} />
        <Field label="Certificate hash" value={truncateMiddle(certificate.certificate_hash, 10, 8)} theme={theme} mono />
        <Field label="On-chain tx" value={certificate.tx_hash ? truncateMiddle(certificate.tx_hash, 10, 8) : 'Pending (mock mode)'} theme={theme} mono />
        {certificate.status === 'revoked' ? (
          <>
            <Field label="Revoked at" value={certificate.revoked_at ? formatDateTime(certificate.revoked_at) : '—'} theme={theme} />
            <Field label="Reason" value={certificate.revoked_reason ?? '—'} theme={theme} />
          </>
        ) : null}
      </Card>

      {certificate.status === 'active' ? (
        <View style={styles.revokeSection}>
          {error ? <InlineAlert message={error} /> : null}
          {showRevokeForm ? (
            <>
              <TextField
                label="Reason for revocation"
                placeholder="e.g. Reported as fraudulent, institution under investigation, etc."
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <View style={styles.buttonRow}>
                <Button label="Cancel" variant="outline" onPress={() => setShowRevokeForm(false)} fullWidth={false} style={{ flex: 1 }} />
                <Button label="Confirm revoke" variant="danger" onPress={handleRevoke} loading={loading} fullWidth={false} style={{ flex: 2 }} />
              </View>
            </>
          ) : (
            <Button
              label="Revoke certificate"
              variant="danger"
              icon={<Ionicons name="close-circle-outline" size={18} color={theme.colors.onPrimary} />}
              onPress={() => setShowRevokeForm(true)}
            />
          )}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function Field({ label, value, theme, mono }: { label: string; value: string; theme: ReturnType<typeof useAppTheme>; mono?: boolean }) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: theme.colors.text, fontFamily: mono ? 'monospace' : undefined }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { alignItems: 'center', marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  revokeSection: { marginTop: 20, gap: 12 },
  buttonRow: { flexDirection: 'row', gap: 12 },
});
