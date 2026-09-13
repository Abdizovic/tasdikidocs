import { MfaSetupReminder } from '@/components/MfaSetupReminder';
import { NotificationBell } from '@/components/NotificationBell';
import { Card, EmptyState, ScreenContainer, StatCard } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { getAnalytics, getAuditLogs } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { AnalyticsSnapshot, AuditLogEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

const ACTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  institution_approve: 'checkmark-circle-outline',
  institution_reject: 'close-circle-outline',
  institution_suspend: 'pause-circle-outline',
  certificate_issue: 'document-text-outline',
  certificate_revoke: 'alert-circle-outline',
};

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminDashboardScreen() {
  const theme = useAppTheme();
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the dashboard. Please try again.'));
    getAuditLogs()
      .then(setLogs)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the dashboard. Please try again.'));
  }, []);

  if (error) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState icon="alert-circle-outline" title="Something went wrong" description={error} />
      </ScreenContainer>
    );
  }

  if (!analytics || !logs) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded={false}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
            Platform overview
          </Text>
          <NotificationBell />
        </View>

        <MfaSetupReminder />

        <View style={styles.grid}>
          <StatCard style={styles.gridItem} label="Institutions" value={analytics.total_institutions} icon="business-outline" tone="primary" />
          <StatCard style={styles.gridItem} label="Pending review" value={analytics.pending_institutions} icon="time-outline" tone="warning" />
          <StatCard style={styles.gridItem} label="Certificates issued" value={analytics.total_certificates} icon="document-text-outline" tone="primary" />
          <StatCard style={styles.gridItem} label="Active certificates" value={analytics.active_certificates} icon="checkmark-circle-outline" tone="success" />
          <StatCard style={styles.gridItem} label="Revoked certificates" value={analytics.revoked_certificates} icon="close-circle-outline" tone="danger" />
          <StatCard style={styles.gridItem} label="Verifications (30d)" value={analytics.verifications_last_30_days} icon="shield-checkmark-outline" tone="primary" />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent activity</Text>
        <View style={{ gap: 10 }}>
          {logs.slice(0, 8).map((log) => (
            <Card key={log.id} style={styles.logRow}>
              <View style={[styles.logIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Ionicons name={ACTION_ICON[log.action] ?? 'ellipse-outline'} size={16} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.logAction, { color: theme.colors.text }]}>{actionLabel(log.action)}</Text>
                <Text style={[styles.logMeta, { color: theme.colors.textMuted }]}>
                  {log.actor_name} · {formatDateTime(log.created_at)}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  // Keeps the wrapping grid at two columns on phones.
  gridItem: { minWidth: 140 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logAction: { fontSize: 14, fontWeight: '700' },
  logMeta: { fontSize: 12, marginTop: 2 },
});
