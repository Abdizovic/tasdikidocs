import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, Card, EmptyState, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ApiKey } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ApiKeysScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const profile = session!.profile;
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile.role === 'admin') listApiKeys(profile.id).then(setKeys);
  }, [profile.id, profile.role]);

  if (profile.role !== 'admin') {
    return <Redirect href="/account/edit-profile" />;
  }

  async function handleGenerate() {
    if (!name.trim()) return;
    setLoading(true);
    const { key, rawKey } = await generateApiKey(profile.id, name.trim());
    setKeys((prev) => [key, ...(prev ?? [])]);
    setRevealedKey(rawKey);
    setCreating(false);
    setName('');
    setLoading(false);
  }

  async function handleRevoke(id: string) {
    await revokeApiKey(profile.id, id);
    setKeys((prev) => (prev ?? []).filter((k) => k.id !== id));
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader title="API Keys" description="Used by server-to-server integrations. This key won’t be shown again after creation." />

      {revealedKey ? (
        <Card style={[styles.revealCard, { borderColor: theme.colors.warning }]}>
          <Text style={[styles.revealLabel, { color: theme.colors.warningDark }]}>Copy this key now — it won’t be shown again</Text>
          <Text selectable style={[styles.revealKey, { color: theme.colors.text }]}>{revealedKey}</Text>
          <Button label="Done" variant="outline" onPress={() => setRevealedKey(null)} />
        </Card>
      ) : null}

      {creating ? (
        <Card style={{ gap: 12, marginBottom: 16 }}>
          <TextField label="Key name" placeholder="e.g. Analytics dashboard" value={name} onChangeText={setName} />
          <View style={styles.buttonRow}>
            <Button label="Cancel" variant="outline" onPress={() => setCreating(false)} fullWidth={false} style={{ flex: 1 }} />
            <Button label="Generate" onPress={handleGenerate} loading={loading} fullWidth={false} style={{ flex: 2 }} />
          </View>
        </Card>
      ) : (
        <Button label="Generate new key" icon={<Ionicons name="add-outline" size={18} color={theme.colors.onPrimary} />} onPress={() => setCreating(true)} style={{ marginBottom: 20 }} />
      )}

      {!keys ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : keys.length === 0 ? (
        <EmptyState icon="code-slash-outline" title="No API keys yet" description="Generate one to authenticate server-side requests." />
      ) : (
        <View style={{ gap: 12 }}>
          {keys.map((k) => (
            <Card key={k.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.keyName, { color: theme.colors.text }]}>{k.name}</Text>
                <Text style={[styles.keyMasked, { color: theme.colors.textSecondary }]}>{k.maskedKey}</Text>
                <Text style={[styles.keyMeta, { color: theme.colors.textMuted }]}>
                  Created {formatDateTime(k.createdAt)}{k.lastUsedAt ? ` · Last used ${formatDateTime(k.lastUsedAt)}` : ' · Never used'}
                </Text>
              </View>
              <Pressable onPress={() => handleRevoke(k.id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  revealCard: { borderWidth: 1.5, gap: 10, marginBottom: 20 },
  revealLabel: { fontSize: 12, fontWeight: '700' },
  revealKey: { fontSize: 13, fontFamily: 'monospace' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  keyName: { fontSize: 14, fontWeight: '700' },
  keyMasked: { fontSize: 13, fontFamily: 'monospace', marginTop: 3 },
  keyMeta: { fontSize: 11, marginTop: 4 },
});
