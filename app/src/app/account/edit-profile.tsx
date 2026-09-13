import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, InlineAlert, NameFields, PhoneField, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { formatDate, initials } from '@/lib/format';
import { isValidEmail } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function EditProfileScreen() {
  const theme = useAppTheme();
  const { session, updateProfile } = useAuth();
  const profile = session!.profile;

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUrl(result.assets[0].uri);
    }
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address, e.g. name@domain.com.');
      return;
    }
    const emailChanged = email.trim().toLowerCase() !== profile.email.toLowerCase();
    setLoading(true);
    try {
      await updateProfile({ firstName, lastName, email, phone: phone || null, avatarUrl });
      setSuccess(
        emailChanged
          ? 'Profile updated. In production, we’d send a confirmation link to your new email before switching it over.'
          : 'Profile updated.',
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Edit Profile" description="Update your personal details and profile photo." />

      <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryDark }]}>
            <Text style={styles.avatarText}>{initials(`${firstName} ${lastName}`)}</Text>
          </View>
        )}
        <View style={[styles.editBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
          <Ionicons name="camera" size={14} color={theme.colors.onPrimary} />
        </View>
      </Pressable>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        {success ? <InlineAlert tone="success" message={success} /> : null}

        <NameFields firstName={firstName} lastName={lastName} onChangeFirstName={setFirstName} onChangeLastName={setLastName} />
        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <PhoneField
          label="Phone number"
          value={phone}
          onChange={setPhone}
          helperText="Used for account recovery and two-factor authentication."
        />

        <View style={styles.readOnlyRow}>
          <Text style={[styles.readOnlyLabel, { color: theme.colors.textMuted }]}>Member since</Text>
          <Text style={[styles.readOnlyValue, { color: theme.colors.text }]}>{formatDate(profile.created_at)}</Text>
        </View>

        <Button label="Save changes" onPress={handleSave} loading={loading} style={{ marginTop: 8 }} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', marginBottom: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  form: { gap: 16 },
  readOnlyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  readOnlyLabel: { fontSize: 13, fontWeight: '600' },
  readOnlyValue: { fontSize: 13, fontWeight: '600' },
});
