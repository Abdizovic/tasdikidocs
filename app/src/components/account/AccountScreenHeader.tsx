import { useAppTheme } from '@/theme/useAppTheme';
import { StyleSheet, Text, View } from 'react-native';

// Native stack headers don't support a subtitle row, so this in-content
// eyebrow label stands in for breadcrumb-style "where am I" context.
export function AccountScreenHeader({ title, description }: { title: string; description?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>ACCOUNT SETTINGS</Text>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, marginBottom: 20, marginTop: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  title: { fontWeight: '800' },
  description: { fontSize: 13, lineHeight: 19 },
});
