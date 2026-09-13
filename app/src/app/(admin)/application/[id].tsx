import { Button, Card, InlineAlert, ScreenContainer, StatusBadge, TextField } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { formatDate } from '@/lib/format';
import { approveInstitution, listInstitutions, rejectInstitution, suspendInstitution } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Institution } from '@/types';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type PendingAction = 'reject' | 'suspend' | null;

export default function ApplicationDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [institution, setInstitution] = useState<Institution | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listInstitutions().then((all) => setInstitution(all.find((i) => i.id === id) ?? null));
  }, [id]);

  async function handleApprove() {
    setError(null);
    setLoading(true);
    try {
      const updated = await approveInstitution(id);
      setInstitution(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReasonAction() {
    setError(null);
    if (!reason.trim()) {
      setError('A reason is required — this is recorded in the audit log.');
      return;
    }
    setLoading(true);
    try {
      const updated =
        pendingAction === 'reject' ? await rejectInstitution(id, reason.trim()) : await suspendInstitution(id, reason.trim());
      setInstitution(updated);
      setPendingAction(null);
      setReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReinstate() {
    setError(null);
    setLoading(true);
    try {
      const updated = await approveInstitution(id);
      setInstitution(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (institution === undefined) {
    return (
      <ScreenContainer scroll={false}>
        <Stack.Screen options={{ headerShown: true, title: 'Application' }} />
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (institution === null) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: 'Application' }} />
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Not found.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: institution.institution_name }} />

      <View style={styles.header}>
        <StatusBadge status={institution.status} />
      </View>

      <Card style={{ gap: 14 }}>
        <Field label="Institution name" value={institution.institution_name} theme={theme} />
        <Field label="Registration number" value={institution.registration_number} theme={theme} />
        <Field label="Country" value={institution.country} theme={theme} />
        {institution.website ? <Field label="Website" value={institution.website} theme={theme} /> : null}
        {institution.contact_phone ? <Field label="Contact phone" value={institution.contact_phone} theme={theme} /> : null}
        <Field label="Applied on" value={formatDate(institution.created_at)} theme={theme} />
        {institution.rejection_reason ? (
          <Field label={institution.status === 'suspended' ? 'Suspension reason' : 'Rejection reason'} value={institution.rejection_reason} theme={theme} />
        ) : null}
      </Card>

      <View style={styles.actions}>
        {error ? <InlineAlert message={error} /> : null}

        {institution.status === 'pending' && !pendingAction ? (
          <>
            <Button label="Approve institution" onPress={handleApprove} loading={loading} />
            <Button label="Reject application" variant="danger" onPress={() => setPendingAction('reject')} />
          </>
        ) : null}

        {institution.status === 'approved' && !pendingAction ? (
          <Button label="Suspend institution" variant="danger" onPress={() => setPendingAction('suspend')} />
        ) : null}

        {institution.status === 'suspended' && !pendingAction ? (
          <Button label="Reinstate institution" onPress={handleReinstate} loading={loading} />
        ) : null}

        {pendingAction ? (
          <>
            <TextField
              label={pendingAction === 'reject' ? 'Reason for rejection' : 'Reason for suspension'}
              placeholder="Explain why, for the audit log"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <View style={styles.buttonRow}>
              <Button label="Cancel" variant="outline" onPress={() => setPendingAction(null)} fullWidth={false} style={{ flex: 1 }} />
              <Button label="Confirm" variant="danger" onPress={handleReasonAction} loading={loading} fullWidth={false} style={{ flex: 2 }} />
            </View>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function Field({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  actions: { gap: 12, marginTop: 20 },
  buttonRow: { flexDirection: 'row', gap: 12 },
});
