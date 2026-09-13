import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Card, EmptyState, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { getAuditLogs } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { AuditLogEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const { profile, institution } = session!;
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    const actorLabel = profile.role === 'institution' ? institution?.institution_name : profile.full_name;
    getAuditLogs().then((all) => setLogs(all.filter((l) => l.actor_name === actorLabel)));
  }, [profile, institution]);

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Audit Log" description="A record of actions taken by this account." />

      {!logs ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : logs.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No activity yet" description="Actions you take will be recorded here." />
      ) : (
        <View style={{ gap: 10 }}>
          {logs.map((log) => (
            <Card key={log.id} style={styles.row}>
              <Ionicons name="ellipse" size={8} color={theme.colors.primary} style={{ marginTop: 6 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.action, { color: theme.colors.text }]}>{actionLabel(log.action)}</Text>
                <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{formatDateTime(log.created_at)}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  action: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
});
