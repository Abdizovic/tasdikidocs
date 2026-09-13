import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, Card, InlineAlert, OtpInput, ScreenContainer } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import {
  cancelMfaEnrollment,
  enrollMfaFactor,
  listMfaFactors,
  MfaEnrollment,
  unenrollMfaFactor,
  verifyMfaEnrollment,
} from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type Status = 'loading' | 'off' | 'enrolling' | 'on';

export default function TwoFactorScreen() {
  const theme = useAppTheme();
  const [status, setStatus] = useState<Status>('loading');
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setStatus('loading');
    try {
      const factors = await listMfaFactors();
      const verified = factors.find((f) => f.status === 'verified');
      setVerifiedFactorId(verified?.id ?? null);
      setStatus(verified ? 'on' : 'off');
    } catch {
      setStatus('off');
    }
  }

  async function handleStartSetup() {
    setError(null);
    setBusy(true);
    try {
      const next = await enrollMfaFactor();
      setEnrollment(next);
      setStatus('enrolling');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start setup. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    try {
      await verifyMfaEnrollment(enrollment!.factorId, code);
      setEnrollment(null);
      setCode('');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelSetup() {
    if (enrollment) await cancelMfaEnrollment(enrollment.factorId);
    setEnrollment(null);
    setCode('');
    setError(null);
    setStatus('off');
  }

  async function handleDisable() {
    if (!verifiedFactorId) return;
    setBusy(true);
    setError(null);
    try {
      await unenrollMfaFactor(verifiedFactorId);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not disable two-factor authentication.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScreenContainer>
        <AccountScreenHeader title="Two-Factor Authentication" />
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (status === 'on') {
    return (
      <ScreenContainer>
        <AccountScreenHeader title="Two-Factor Authentication" />
        <Card style={styles.statusCard}>
          <Ionicons name="shield-checkmark" size={36} color={theme.colors.success} />
          <Text style={[styles.statusTitle, { color: theme.colors.text }]}>2FA is enabled</Text>
          <Text style={[styles.statusBody, { color: theme.colors.textSecondary }]}>
            You’ll be asked for a code from your authenticator app every time you sign in.
          </Text>
        </Card>
        {error ? <InlineAlert message={error} /> : null}
        <Button label="Disable Two-Factor Authentication" variant="danger" onPress={handleDisable} loading={busy} />
      </ScreenContainer>
    );
  }

  if (status === 'enrolling' && enrollment) {
    return (
      <ScreenContainer>
        <AccountScreenHeader
          title="Set up Two-Factor Authentication"
          description="Scan this code with Google Authenticator, Authy, or a similar app."
        />
        <Card style={styles.qrCard}>
          <QRCode value={enrollment.uri} size={170} color={theme.colors.text} backgroundColor="transparent" />
        </Card>
        <Text style={[styles.manualEntry, { color: theme.colors.textSecondary }]} selectable>
          Can&apos;t scan it? Enter this setup key manually: {enrollment.secret}
        </Text>
        <View style={{ gap: 16 }}>
          {error ? <InlineAlert message={error} /> : null}
          <Text style={[styles.label, { color: theme.colors.text }]}>Enter the 6-digit code to confirm</Text>
          <OtpInput value={code} onChange={setCode} autoFocus />
          <Button label="Confirm and enable" onPress={handleConfirm} loading={busy} />
          <Button label="Cancel" variant="ghost" onPress={handleCancelSetup} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account by requiring a code from an authenticator app at sign-in."
      />
      <Card style={styles.statusCard}>
        <Ionicons name="shield-outline" size={36} color={theme.colors.textMuted} />
        <Text style={[styles.statusTitle, { color: theme.colors.text }]}>2FA is currently off</Text>
      </Card>
      {error ? <InlineAlert message={error} /> : null}
      <Button label="Enable Two-Factor Authentication" onPress={handleStartSetup} loading={busy} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statusCard: { alignItems: 'center', gap: 8, paddingVertical: 28, marginBottom: 20 },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
  qrCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 12 },
  manualEntry: { fontSize: 12, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600' },
});
