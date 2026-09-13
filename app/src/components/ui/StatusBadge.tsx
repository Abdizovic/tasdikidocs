import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export type StatusKind =
  | 'active'
  | 'valid'
  | 'approved'
  | 'revoked'
  | 'invalid'
  | 'rejected'
  | 'suspended'
  | 'pending'
  | 'not_found';

const CONFIG: Record<StatusKind, { icon: keyof typeof Ionicons.glyphMap; label: string; tone: 'success' | 'danger' | 'warning' }> = {
  active: { icon: 'checkmark-circle', label: 'Active', tone: 'success' },
  valid: { icon: 'shield-checkmark', label: 'Valid', tone: 'success' },
  approved: { icon: 'checkmark-circle', label: 'Approved', tone: 'success' },
  revoked: { icon: 'close-circle', label: 'Revoked', tone: 'danger' },
  invalid: { icon: 'alert-circle', label: 'Invalid', tone: 'danger' },
  rejected: { icon: 'close-circle', label: 'Rejected', tone: 'danger' },
  suspended: { icon: 'pause-circle', label: 'Suspended', tone: 'danger' },
  pending: { icon: 'time', label: 'Pending Review', tone: 'warning' },
  not_found: { icon: 'help-circle', label: 'Not Found', tone: 'warning' },
};

export function StatusBadge({ status, label }: { status: StatusKind; label?: string }) {
  const theme = useAppTheme();
  const cfg = CONFIG[status];
  const bg = theme.colors[`${cfg.tone}Bg` as keyof typeof theme.colors] as string;
  const fg = theme.colors[cfg.tone] as string;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: theme.radii.full }]}>
      <Ionicons name={cfg.icon} size={14} color={fg} />
      <Text style={[styles.label, { color: fg }]}>{label ?? cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
