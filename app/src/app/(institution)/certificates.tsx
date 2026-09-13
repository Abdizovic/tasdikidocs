import { Card, EmptyState, ScreenContainer, StatusBadge, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { listCertificatesForInstitution } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function CertificatesScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session!.institution!;
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listCertificatesForInstitution(institution.id).then(setCertificates);
  }, [institution.id]);

  const filtered = useMemo(() => {
    if (!certificates) return [];
    const q = query.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        c.student_name.toLowerCase().includes(q) ||
        c.registration_number.toLowerCase().includes(q) ||
        c.course_name.toLowerCase().includes(q),
    );
  }, [certificates, query]);

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
          Certificates
        </Text>
        <Pressable onPress={() => router.push('/(institution)/bulk-issue')} style={styles.bulkButton}>
          <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.bulkButtonText, { color: theme.colors.primary }]}>Bulk import</Text>
        </Pressable>
      </View>

      <TextField
        placeholder="Search by name, reg. number, or course"
        value={query}
        onChangeText={setQuery}
        leftIcon={<Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />}
        style={styles.search}
      />

      {!certificates ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={query ? 'No matches' : 'No certificates yet'}
          description={query ? 'Try a different name or registration number.' : 'Issued certificates will appear here.'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(institution)/certificate/${item.id}`)}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.student_name}</Text>
                  <Text style={[styles.course, { color: theme.colors.textSecondary }]}>{item.course_name}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
                    {item.registration_number} · {formatDate(item.issue_date)}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontWeight: '800' },
  bulkButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bulkButtonText: { fontSize: 13, fontWeight: '700' },
  search: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  course: { fontSize: 13, marginTop: 2 },
  meta: { fontSize: 12, marginTop: 4 },
});
