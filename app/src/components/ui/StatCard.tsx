import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'success' | 'danger' | 'warning';
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ label, value, icon, tone = 'primary', style }: StatCardProps) {
  const theme = useAppTheme();
  const fg =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'success'
        ? theme.colors.success
        : tone === 'danger'
          ? theme.colors.danger
          : theme.colors.warning;
  const bg =
    tone === 'primary'
      ? theme.colors.surfaceAlt
      : tone === 'success'
        ? theme.colors.successBg
        : tone === 'danger'
          ? theme.colors.dangerBg
          : theme.colors.warningBg;

  return (
    <Card style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: bg, borderRadius: theme.radii.md }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.value, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.label, { color: theme.colors.textSecondary }]}
      >
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  // minWidth: 0 lets three cards share one phone-width row; wrapping grids
  // pass their own minWidth via `style`.
  card: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
  },
});
