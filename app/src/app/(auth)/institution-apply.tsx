import { Button, CountryField, InlineAlert, NameFields, PasswordField, PasswordStrengthChecklist, PhoneField, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { isPasswordValid, isValidEmail } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function InstitutionApplyScreen() {
  const theme = useAppTheme();
  const { applyAsInstitution } = useAuth();
  const [step, setStep] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [institutionName, setInstitutionName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  function goToDetails() {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Fill in your name, email, and a password to continue.');
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
    setStep(1);
  }

  async function handleSubmit() {
    setError(null);
    if (!institutionName.trim() || !registrationNumber.trim() || !country.trim()) {
      setError('Institution name, registration number, and country are required.');
      return;
    }
    setLoading(true);
    try {
      await applyAsInstitution({
        firstName,
        lastName,
        email,
        password,
        institutionName,
        registrationNumber,
        country,
        website: website.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      // Session is created with status "pending" — the (institution) layout
      // shows the pending-review screen automatically once routed there.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Apply as an Institution' }} />

      <View style={styles.header}>
        <Text style={[styles.step, { color: theme.colors.primary }]}>Step {step + 1} of 2</Text>
        <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
          {step === 0 ? 'Create your account' : 'Tell us about your institution'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {step === 0
            ? 'This is who we contact about your application.'
            : 'A platform admin reviews every application before you can issue certificates.'}
        </Text>
      </View>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}

        {step === 0 ? (
          <>
            <NameFields firstName={firstName} lastName={lastName} onChangeFirstName={setFirstName} onChangeLastName={setLastName} />
            <TextField
              label="Work email"
              placeholder="registrar@youruniversity.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" />
            <PasswordStrengthChecklist password={password} />
            <Button label="Continue" onPress={goToDetails} />
          </>
        ) : (
          <>
            <TextField label="Institution name" placeholder="Nairobi Institute of Technology" value={institutionName} onChangeText={setInstitutionName} />
            <TextField label="Registration number" placeholder="REG-KE-000000" value={registrationNumber} onChangeText={setRegistrationNumber} autoCapitalize="characters" />
            <CountryField value={country} onChange={setCountry} />
            <TextField label="Website (optional)" placeholder="https://youruniversity.edu" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
            <PhoneField label="Contact phone (optional)" value={contactPhone} onChange={setContactPhone} />

            <View style={styles.buttonRow}>
              <Button label="Back" variant="outline" onPress={() => setStep(0)} fullWidth={false} style={{ flex: 1 }} />
              <Button label="Submit application" onPress={handleSubmit} loading={loading} fullWidth={false} style={{ flex: 2 }} />
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6, marginBottom: 24, marginTop: 8 },
  step: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  form: { gap: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
});
