import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface InlineAlertProps {
  tone?: 'danger' | 'success' | 'warning' | 'info';
  message: string;
}

export function InlineAlert({ tone = 'danger', message }: InlineAlertProps) {
  const theme = useAppTheme();
  const bg = theme.colors[`${tone}Bg` as keyof typeof theme.colors] as string;
  const fg = theme.colors[tone as keyof typeof theme.colors] as string;
  const icon = tone === 'success' ? 'checkmark-circle' : tone === 'warning' ? 'warning' : tone === 'info' ? 'information-circle' : 'alert-circle';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderRadius: theme.radii.md }]}>
      <Ionicons name={icon} size={18} color={fg} style={{ marginTop: 1 }} />
      <Text style={[styles.message, { color: fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
