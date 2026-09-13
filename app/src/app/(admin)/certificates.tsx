import { Card, EmptyState, FilterChips, ScreenContainer, StatusBadge, TextField, type FilterOption } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { formatDate } from '@/lib/format';
import { listAllCertificates } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate, CertificateStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

const FILTERS: FilterOption<CertificateStatus | 'all'>[] = [
  { label: 'All', value: 'all', icon: 'layers-outline' },
  { label: 'Active', value: 'active', icon: 'checkmark-circle-outline' },
  { label: 'Revoked', value: 'revoked', icon: 'close-circle-outline' },
];

export default function AdminCertificatesScreen() {
  const theme = useAppTheme();
  const [filter, setFilter] = useState<CertificateStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      listAllCertificates({ status: filter === 'all' ? undefined : filter, query: query || undefined })
        .then(setCertificates)
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load certificates. Please try again.'));
    }, [filter, query]),
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
        All certificates
      </Text>

      {/* TextField forwards `style` to the inner input, so spacing goes on a wrapper. */}
      <View style={styles.search}>
        <TextField
          placeholder="Search by student, reg. number, or institution"
          value={query}
          onChangeText={setQuery}
          leftIcon={<Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />}
        />
      </View>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} style={styles.filters} />

      {error ? (
        <EmptyState icon="alert-circle-outline" title="Something went wrong" description={error} />
      ) : !certificates ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : certificates.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No certificates found" description="Try a different search or filter." />
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingTop: 4, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(admin)/certificate/${item.id}`)}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.student_name}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.institution_name}</Text>
                  <Text style={[styles.date, { color: theme.colors.textMuted }]}>
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
  title: { fontWeight: '800', marginBottom: 16 },
  search: { marginBottom: 20 },
  filters: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 4 },
});
