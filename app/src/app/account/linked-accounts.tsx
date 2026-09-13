import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Card, ScreenContainer } from '@/components/ui';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Provider {
  id: 'google' | 'microsoft';
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PROVIDERS: Provider[] = [
  { id: 'google', name: 'Google', icon: 'logo-google' },
  { id: 'microsoft', name: 'Microsoft', icon: 'logo-microsoft' },
];

// Local-only mock state — not wired to real OAuth yet. Included so the
// account settings surface is complete now and just needs a real provider
// swapped in later.
export default function LinkedAccountsScreen() {
  const theme = useAppTheme();
  const [connected, setConnected] = useState<Record<string, boolean>>({ google: false, microsoft: false });
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string) {
    setBusy(id);
    await new Promise((r) => setTimeout(r, 500));
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader
        title="Linked Accounts"
        description="Connect a single sign-on provider for faster login. Illustrative for now — real OAuth wiring comes with the Supabase integration phase."
      />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {PROVIDERS.map((p, index) => (
          <View
            key={p.id}
            style={[styles.row, index < PROVIDERS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
          >
            <Ionicons name={p.icon} size={22} color={theme.colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{p.name}</Text>
              <Text style={[styles.status, { color: connected[p.id] ? theme.colors.success : theme.colors.textMuted }]}>
                {connected[p.id] ? 'Connected' : 'Not connected'}
              </Text>
            </View>
            {busy === p.id ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Pressable onPress={() => toggle(p.id)}>
                <Text style={{ color: connected[p.id] ? theme.colors.danger : theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                  {connected[p.id] ? 'Disconnect' : 'Connect'}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  name: { fontSize: 15, fontWeight: '600' },
  status: { fontSize: 12, marginTop: 2 },
});
