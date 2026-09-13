import { Button, InlineAlert, ScreenContainer, TextField } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { requestPasswordResetOtp } from '@/lib/mockApi';
import { isValidEmail } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Enter the email address on your account.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address, e.g. name@domain.com.');
      return;
    }
    setLoading(true);
    try {
      const { devOtp } = await requestPasswordResetOtp(email);
      router.push({ pathname: '/(auth)/verify-otp', params: { email, devOtp: devOtp ?? '' } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <View style={styles.iconWrap}>
        <View style={[styles.circle, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name="key-outline" size={28} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
        Forgot your password?
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Enter your email and we’ll send a 6-digit verification code to reset it.
      </Text>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        <TextField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <Button label="Send verification code" onPress={handleSubmit} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  form: { gap: 16 },
});
