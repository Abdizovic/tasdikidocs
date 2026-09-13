import { useAppTheme } from '@/theme/useAppTheme';
import { StyleSheet, Text, View } from 'react-native';

// Callers pass `isLast` explicitly on the final AccountMenuRow child so it
// can skip its bottom border — simpler and more explicit than cloning
// children to inject index-derived props.
export function AccountMenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  card: { borderWidth: 1, overflow: 'hidden' },
});
