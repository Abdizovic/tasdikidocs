import { Card, EmptyState, ScreenContainer, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { getHistory, type HistoryEntry } from '@/lib/verificationHistory';
import { useAppTheme } from '@/theme/useAppTheme';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  const theme = useAppTheme();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setEntries);
    }, []),
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>
        Verification history
      </Text>

      {entries && entries.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No verifications yet"
          description="Certificates you scan or search will show up here."
        />
      ) : (
        <FlatList
          data={entries ?? []}
          keyExtractor={(item, idx) => `${item.query}_${idx}`}
          contentContainerStyle={{ gap: 10, paddingTop: 8, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/(verifier)/result', params: { query: item.query } })}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.studentName ?? item.query}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{formatDateTime(item.checkedAt)}</Text>
                </View>
                <StatusBadge status={item.result} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
});
