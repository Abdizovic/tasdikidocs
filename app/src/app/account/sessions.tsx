import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Button, Card, ScreenContainer, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { listSessions, revokeAllOtherSessions, revokeSession } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { DeviceSession } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function SessionsScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const profileId = session!.profile.id;
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);

  useEffect(() => {
    listSessions(profileId).then(setSessions);
  }, [profileId]);

  async function handleRevoke(id: string) {
    const updated = await revokeSession(profileId, id);
    setSessions(updated);
  }

  async function handleRevokeAllOthers() {
    const updated = await revokeAllOtherSessions(profileId);
    setSessions(updated);
  }

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Login Activity" description="Devices currently signed in to your account." />

      {!sessions ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <>
          {sessions.length > 1 ? (
            <Button label="Sign out all other devices" variant="outline" onPress={handleRevokeAllOthers} style={{ marginBottom: 16 }} />
          ) : null}
          <View style={{ gap: 12 }}>
            {sessions.map((s) => (
              <Card key={s.id} style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Ionicons name={s.device.toLowerCase().includes('iphone') || s.device.toLowerCase().includes('pixel') ? 'phone-portrait-outline' : 'desktop-outline'} size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.deviceRow}>
                    <Text style={[styles.device, { color: theme.colors.text }]}>{s.device}</Text>
                    {s.isCurrent ? <StatusBadge status="active" label="This device" /> : null}
                  </View>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{s.location} · {s.ipAddress}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Last active {formatDateTime(s.lastActiveAt)}</Text>
                </View>
                {!s.isCurrent ? (
                  <Pressable onPress={() => handleRevoke(s.id)} hitSlop={10}>
                    <Ionicons name="close-circle-outline" size={22} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  device: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
});
