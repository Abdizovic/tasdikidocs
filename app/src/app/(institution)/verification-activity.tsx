import { Card, EmptyState, ScreenContainer, StatCard, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { listCertificatesForInstitution, listVerificationEventsForInstitution } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate, VerificationEvent } from '@/types';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function VerificationActivityScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session!.institution!;
  const [events, setEvents] = useState<VerificationEvent[] | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [counts, setCounts] = useState<{ last7Days: number; last30Days: number } | null>(null);

  useEffect(() => {
    listVerificationEventsForInstitution(institution.id).then((evts) => {
      setEvents(evts);
      const now = Date.now();
      setCounts({
        last7Days: evts.filter((e) => now - new Date(e.created_at).getTime() <= 7 * DAY_MS).length,
        last30Days: evts.filter((e) => now - new Date(e.created_at).getTime() <= 30 * DAY_MS).length,
      });
    });
    listCertificatesForInstitution(institution.id).then(setCertificates);
  }, [institution.id]);

  if (!events || !counts) {
    return (
      <ScreenContainer scroll={false}>
        <Stack.Screen options={{ headerShown: true, title: 'Verification Activity' }} />
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const certById = new Map(certificates.map((c) => [c.id, c]));

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Verification Activity' }} />

      <View style={styles.statsRow}>
        <StatCard label="Total checks" value={events.length} icon="shield-checkmark-outline" tone="primary" />
        <StatCard label="Last 7 days" value={counts.last7Days} icon="calendar-outline" tone="primary" />
        <StatCard label="Last 30 days" value={counts.last30Days} icon="stats-chart-outline" tone="primary" />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent checks</Text>

      {events.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No checks yet"
          description="Every time someone verifies one of your certificates, it will show up here."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {events.map((e) => {
            const cert = e.certificate_id ? certById.get(e.certificate_id) : undefined;
            return (
              <Card key={e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{cert?.student_name ?? e.searched_value}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{formatDateTime(e.created_at)}</Text>
                </View>
                <StatusBadge status={e.result} />
              </Card>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
});
