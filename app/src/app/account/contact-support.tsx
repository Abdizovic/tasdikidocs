import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, Card, InlineAlert, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { submitSupportTicket } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const CATEGORIES = ['Account', 'Certificate dispute', 'Technical issue', 'Institution application', 'Other'];

export default function ContactSupportScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const profile = session!.profile;

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!subject.trim() || !message.trim()) {
      setError('Fill in a subject and a message before sending.');
      return;
    }
    setLoading(true);
    try {
      const { ticketId: id } = await submitSupportTicket(profile, { category, subject: subject.trim(), message: message.trim() });
      setTicketId(id);
    } finally {
      setLoading(false);
    }
  }

  if (ticketId) {
    return (
      <ScreenContainer>
        <AccountScreenHeader title="Contact Support" />
        <View style={styles.successWrap}>
          <View style={[styles.circle, { backgroundColor: theme.colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.colors.text }]}>Message sent</Text>
          <Text style={[styles.successBody, { color: theme.colors.textSecondary }]}>
            We’ve logged your request as <Text style={{ fontWeight: '700' }}>{ticketId}</Text>. We’ll reply to{' '}
            {profile.email} as soon as a support agent picks it up.
          </Text>
          <Button label="Done" onPress={() => router.back()} style={{ marginTop: 24 }} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Contact Support" description="Tell us what's going on and we'll follow up by email." />

      <View style={{ gap: 16 }}>
        {error ? <InlineAlert message={error} /> : null}

        <View>
          <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt, borderRadius: theme.radii.full }]}
                >
                  <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={{ gap: 10 }}>
          <Row label="From" value={profile.full_name} theme={theme} />
          <Row label="Email" value={profile.email} theme={theme} />
        </Card>

        <TextField label="Subject" placeholder="A short summary of your issue" value={subject} onChangeText={setSubject} />
        <TextField
          label="Message"
          placeholder="Describe what happened, including any certificate IDs involved"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />

        <Button label="Send message" onPress={handleSubmit} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '600' },
  successWrap: { alignItems: 'center', gap: 8, marginTop: 40, paddingHorizontal: 12 },
  circle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 18, fontWeight: '800' },
  successBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
