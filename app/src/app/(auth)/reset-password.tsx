import { Button, InlineAlert, PasswordField, PasswordStrengthChecklist, ScreenContainer } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { resetPassword } from '@/lib/mockApi';
import { isPasswordValid } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ResetPasswordScreen() {
  const theme = useAppTheme();
  const { email, resetToken } = useLocalSearchParams<{ email: string; resetToken: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!isPasswordValid(password)) {
      setError('Your password doesn’t meet all the requirements below yet.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, resetToken, password);
      setSuccess(true);
      setTimeout(() => router.replace('/(auth)/login'), 1400);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <View style={styles.successWrap}>
          <View style={[styles.circle, { backgroundColor: theme.colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
            Password updated
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Taking you to sign in…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <View style={styles.iconWrap}>
        <View style={[styles.circle, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name="lock-closed-outline" size={28} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
        Set a new password
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Choose a strong password you haven’t used before.
      </Text>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        <PasswordField label="New password" value={password} onChangeText={setPassword} placeholder="Create a new password" />
        <PasswordStrengthChecklist password={password} />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your new password"
        />
        <Button label="Reset password" onPress={handleSubmit} loading={loading} />
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
  successWrap: { alignItems: 'center', gap: 12, marginTop: 80 },
});
