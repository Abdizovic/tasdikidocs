import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface AccountMenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  subtitle?: string;
  isLast?: boolean;
  /** Swaps the chevron for a spinner and ignores presses. */
  loading?: boolean;
}

export function AccountMenuRow({ icon, label, onPress, danger, subtitle, isLast, loading }: AccountMenuRowProps) {
  const theme = useAppTheme();
  const fg = danger ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
        pressed && { backgroundColor: theme.colors.surfaceAlt },
      ]}
    >
      <Ionicons name={icon} size={19} color={danger ? theme.colors.danger : theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={17} color={theme.colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  label: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
});
