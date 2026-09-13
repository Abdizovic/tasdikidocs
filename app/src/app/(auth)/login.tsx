import { BrandMark } from '@/components/BrandMark';
import { Button, InlineAlert, OtpInput, PasswordField, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { signOutSupabase } from '@/lib/mockApi';
import { isValidEmail } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { signIn, completeMfaLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (lockedSeconds === null || lockedSeconds <= 0) return;
    const timer = setTimeout(() => setLockedSeconds((s) => (s !== null && s > 1 ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [lockedSeconds]);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address, e.g. name@domain.com.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // Root layout's Stack.Protected guards pick up the new session and
      // swap in the correct role-based route group automatically.
    } catch (e) {
      if (e instanceof ApiError && e.code === 'locked') {
        setLockedSeconds(e.retryAfterSeconds ?? 60);
      } else if (e instanceof ApiError && e.code === 'mfa_required' && e.mfaFactorId) {
        setMfaFactorId(e.mfaFactorId);
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyMfa() {
    setError(null);
    if (mfaCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      await completeMfaLogin(mfaFactorId!, mfaCode);
      // Root layout's Stack.Protected guards pick up the new session.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (mfaFactorId) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <BrandMark size={56} showWordmark={false} />
          <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
            Two-factor authentication
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter the 6-digit code from your authenticator app
          </Text>
        </View>

        <View style={styles.form}>
          {error ? <InlineAlert message={error} /> : null}
          <OtpInput value={mfaCode} onChange={setMfaCode} autoFocus />
          <Button label="Verify" onPress={handleVerifyMfa} loading={loading} />
          <Text
            onPress={() => {
              signOutSupabase();
              setMfaFactorId(null);
              setMfaCode('');
              setError(null);
            }}
            style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13, textAlign: 'center' }}
          >
            Back to sign in
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <BrandMark size={56} showWordmark={false} />
        <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
          Welcome back
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sign in to your account</Text>
      </View>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        {lockedSeconds !== null ? (
          <InlineAlert tone="warning" message={`Too many failed attempts. Try again in ${lockedSeconds}s.`} />
        ) : null}

        <TextField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          leftIcon={<Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} />}
        />

        <PasswordField value={password} onChangeText={setPassword} placeholder="Enter your password" />

        <Link href="/(auth)/forgot-password" style={[styles.forgot, { color: theme.colors.primary }]}>
          Forgot password?
        </Link>

        <Button
          label={lockedSeconds !== null ? `Try again in ${lockedSeconds}s` : 'Sign In'}
          onPress={handleSubmit}
          loading={loading}
          disabled={lockedSeconds !== null}
        />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.colors.textSecondary }}>New verifier? </Text>
        <Link href="/(auth)/signup" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          Create a free account
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 8, marginBottom: 32, marginTop: 8 },
  title: { fontWeight: '800' },
  subtitle: { fontSize: 14 },
  form: { gap: 16 },
  forgot: { alignSelf: 'flex-end', fontWeight: '600', fontSize: 13, marginTop: -4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
