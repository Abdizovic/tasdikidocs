import { Card, EmptyState, ScreenContainer, StatusBadge, TextField } from '@/components/ui';
import { ApiError } from '@/lib/apiError';
import { listInstitutions } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Institution } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function InstitutionsScreen() {
  const theme = useAppTheme();
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      setError(null);
      listInstitutions()
        .then(setInstitutions)
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load institutions. Please try again.'));
    }, []),
  );

  const filtered = useMemo(() => {
    if (!institutions) return [];
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (i) => i.institution_name.toLowerCase().includes(q) || i.registration_number.toLowerCase().includes(q),
    );
  }, [institutions, query]);

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
        All institutions
      </Text>

      <TextField
        placeholder="Search institutions"
        value={query}
        onChangeText={setQuery}
        leftIcon={<Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />}
        style={styles.search}
      />

      {error ? (
        <EmptyState icon="alert-circle-outline" title="Something went wrong" description={error} />
      ) : !institutions ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="business-outline" title="No institutions found" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(admin)/application/${item.id}`)}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.institution_name}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{item.registration_number}</Text>
                </View>
                <StatusBadge status={item.status} />
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
  search: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
});
