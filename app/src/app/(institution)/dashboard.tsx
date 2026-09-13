import { MfaSetupReminder } from '@/components/MfaSetupReminder';
import { NotificationBell } from '@/components/NotificationBell';
import { Button, Card, EmptyState, ScreenContainer, StatCard, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { listCertificatesForInstitution } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function InstitutionDashboardScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session!.institution!;
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    listCertificatesForInstitution(institution.id).then(setCertificates);
  }, [institution.id]);

  async function onRefresh() {
    setRefreshing(true);
    const data = await listCertificatesForInstitution(institution.id);
    setCertificates(data);
    setRefreshing(false);
  }

  if (!certificates) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const active = certificates.filter((c) => c.status === 'active').length;
  const revoked = certificates.filter((c) => c.status === 'revoked').length;
  const recent = certificates.slice(0, 4);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.institutionName, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
              {institution.institution_name}
            </Text>
          </View>
          <NotificationBell />
        </View>

        <MfaSetupReminder />

        <View style={styles.statsRow}>
          <StatCard label="Total issued" value={certificates.length} icon="document-text-outline" tone="primary" />
          <StatCard label="Active" value={active} icon="checkmark-circle-outline" tone="success" />
          <StatCard label="Revoked" value={revoked} icon="close-circle-outline" tone="danger" />
        </View>

        <Pressable
          onPress={() => router.push('/(institution)/verification-activity')}
          hitSlop={8}
          style={styles.verificationLink}
        >
          <Text style={[styles.verificationLinkText, { color: theme.colors.primary }]}>View verification activity</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
        </Pressable>

        <Button
          label="Issue new certificate"
          icon={<Ionicons name="add-circle-outline" size={18} color={theme.colors.onPrimary} />}
          onPress={() => router.push('/(institution)/issue-certificate')}
          style={{ marginTop: theme.spacing.xl }}
        />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent activity</Text>
          <Text
            onPress={() => router.push('/(institution)/certificates')}
            style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}
          >
            View all
          </Text>
        </View>

        {recent.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No certificates yet"
            description="Certificates you issue will show up here."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {recent.map((cert) => (
              <Card key={cert.id} style={styles.certRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: theme.colors.text }]}>{cert.student_name}</Text>
                  <Text style={[styles.courseName, { color: theme.colors.textSecondary }]}>{cert.course_name}</Text>
                  <Text style={[styles.date, { color: theme.colors.textMuted }]}>{formatDate(cert.issue_date)}</Text>
                </View>
                <StatusBadge status={cert.status} />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14 },
  institutionName: { fontWeight: '800', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  verificationLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 14 },
  verificationLinkText: { fontSize: 13, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentName: { fontSize: 15, fontWeight: '700' },
  courseName: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 4 },
});
