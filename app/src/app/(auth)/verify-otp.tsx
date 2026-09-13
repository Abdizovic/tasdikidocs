import { Button, InlineAlert, OtpInput, ScreenContainer } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { resendPasswordResetOtp, verifyPasswordResetOtp } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const RESEND_SECONDS = 45;

export default function VerifyOtpScreen() {
  const theme = useAppTheme();
  const { email, devOtp } = useLocalSearchParams<{ email: string; devOtp?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [latestDevOtp, setLatestDevOtp] = useState(devOtp);
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (lockedSeconds === null || lockedSeconds <= 0) return;
    const t = setTimeout(() => setLockedSeconds((s) => (s !== null && s > 1 ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [lockedSeconds]);

  async function handleVerify() {
    setError(null);
    if (code.length !== 6) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { resetToken } = await verifyPasswordResetOtp(email, code);
      router.push({ pathname: '/(auth)/reset-password', params: { email, resetToken } });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'locked') {
        setLockedSeconds(e.retryAfterSeconds ?? 60);
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setCode('');
    const { devOtp: nextOtp } = await resendPasswordResetOtp(email);
    setLatestDevOtp(nextOtp);
    setSecondsLeft(RESEND_SECONDS);
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <View style={styles.iconWrap}>
        <View style={[styles.circle, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name="mail-open-outline" size={28} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
        Check your email
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        We sent a 6-digit code to <Text style={{ fontWeight: '700' }}>{email}</Text>
      </Text>

      {latestDevOtp ? (
        <View style={[styles.devBanner, { backgroundColor: theme.colors.warningBg }]}>
          <Text style={{ color: theme.colors.warningDark, fontSize: 12, fontWeight: '600' }}>
            Demo mode (no email backend yet) — your code is {latestDevOtp}
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        {lockedSeconds !== null ? (
          <InlineAlert tone="warning" message={`Too many attempts. Try again in ${lockedSeconds}s.`} />
        ) : null}
        <OtpInput value={code} onChange={setCode} autoFocus />

        <Button
          label={lockedSeconds !== null ? `Try again in ${lockedSeconds}s` : 'Verify code'}
          onPress={handleVerify}
          loading={loading}
          disabled={lockedSeconds !== null}
        />

        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Resend code in {secondsLeft}s</Text>
          ) : (
            <Text onPress={handleResend} style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
              Resend code
            </Text>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  devBanner: { marginTop: 16, padding: 10, borderRadius: 8 },
  form: { gap: 20, marginTop: 24 },
  resendRow: { alignItems: 'center' },
});
