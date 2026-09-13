import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, InlineAlert, PasswordField, PasswordStrengthChecklist, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { changePassword } from '@/lib/mockApi';
import { isPasswordValid } from '@/lib/validation';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function ChangePasswordScreen() {
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setError('Your new password doesn’t meet all the requirements below yet.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(session!.profile.id, currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Change Password" description="Choose a strong password you haven’t used before." />

      <View style={{ gap: 16 }}>
        {error ? <InlineAlert message={error} /> : null}
        {success ? <InlineAlert tone="success" message="Password changed successfully." /> : null}

        <PasswordField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter your current password" />
        <PasswordField label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="Create a new password" />
        <PasswordStrengthChecklist password={newPassword} />
        <PasswordField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your new password" />

        <Button label="Update password" onPress={handleSubmit} loading={loading} />
      </View>
    </ScreenContainer>
  );
}
