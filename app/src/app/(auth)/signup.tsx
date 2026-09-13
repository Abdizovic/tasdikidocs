import { Button, InlineAlert, NameFields, PasswordField, PasswordStrengthChecklist, PhoneField, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { isPasswordValid, isValidEmail } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SignupScreen() {
  const theme = useAppTheme();
  const { signUpVerifier } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Fill in all fields to continue.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address, e.g. name@domain.com.');
      return;
    }
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
      await signUpVerifier({ firstName, lastName, email, password, phone: phone || undefined });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Apply as a Verifier' }} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
          Create your verifier account
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Free and instant — check any certificate as an employer, or manage your own.
        </Text>
      </View>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}

        <NameFields firstName={firstName} lastName={lastName} onChangeFirstName={setFirstName} onChangeLastName={setLastName} />
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
        <PhoneField
          label="Phone number (optional)"
          value={phone}
          onChange={setPhone}
          helperText="Used for account recovery and two-factor authentication."
        />
        <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" />
        <PasswordStrengthChecklist password={password} />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
        />

        <Button label="Create account" onPress={handleSubmit} loading={loading} />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.colors.textSecondary }}>Already have an account? </Text>
        <Link href="/(auth)/login" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          Sign in
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 28, marginTop: 8 },
  title: { fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
