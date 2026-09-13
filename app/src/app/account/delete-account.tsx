import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, Card, InlineAlert, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { deactivateAccount } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CONFIRM_PHRASE = 'DEACTIVATE';

export default function DeleteAccountScreen() {
  const theme = useAppTheme();
  const { session, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    setError(null);
    if (confirmText.trim().toUpperCase() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" to confirm.`);
      return;
    }
    setLoading(true);
    try {
      await deactivateAccount(session!.profile.id);
      await signOut();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Deactivate Account" />

      <Card style={[styles.warningCard, { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerBg }]}>
        <Ionicons name="warning-outline" size={24} color={theme.colors.danger} />
        <Text style={[styles.warningText, { color: theme.colors.dangerDark }]}>
          Deactivating your account signs you out everywhere and disables access. Certificates already issued or
          verified remain on record — this action does not rewrite blockchain history.
        </Text>
      </Card>

      <View style={{ gap: 16 }}>
        {error ? <InlineAlert message={error} /> : null}
        <TextField
          label={`Type "${CONFIRM_PHRASE}" to confirm`}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button label="Deactivate my account" variant="danger" onPress={handleDeactivate} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  warningCard: { flexDirection: 'row', gap: 12, borderWidth: 1.5, marginBottom: 24 },
  warningText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
