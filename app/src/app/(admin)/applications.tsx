import { Card, EmptyState, FilterChips, ScreenContainer, StatusBadge, type FilterOption } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { formatDate } from '@/lib/format';
import { listInstitutions } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Institution, InstitutionStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

const FILTERS: FilterOption<InstitutionStatus | 'all'>[] = [
  { label: 'All', value: 'all', icon: 'apps-outline' },
  { label: 'Pending', value: 'pending', icon: 'time-outline' },
  { label: 'Approved', value: 'approved', icon: 'checkmark-circle-outline' },
  { label: 'Rejected', value: 'rejected', icon: 'close-circle-outline' },
  { label: 'Suspended', value: 'suspended', icon: 'pause-circle-outline' },
];

export default function ApplicationsScreen() {
  const theme = useAppTheme();
  const [filter, setFilter] = useState<InstitutionStatus | 'all'>('pending');
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      listInstitutions(filter === 'all' ? undefined : filter)
        .then(setInstitutions)
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load applications. Please try again.'));
    }, [filter]),
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
        Institution applications
      </Text>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} style={styles.filters} />

      {error ? (
        <EmptyState icon="alert-circle-outline" title="Something went wrong" description={error} />
      ) : !institutions ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : institutions.length === 0 ? (
        <EmptyState icon="mail-open-outline" title="Nothing here" description="No institutions match this filter." />
      ) : (
        <FlatList
          data={institutions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingTop: 4, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(admin)/application/${item.id}`)}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.institution_name}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                    {item.registration_number} · {item.country}
                  </Text>
                  <Text style={[styles.date, { color: theme.colors.textMuted }]}>Applied {formatDate(item.created_at)}</Text>
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
  filters: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 4 },
});
