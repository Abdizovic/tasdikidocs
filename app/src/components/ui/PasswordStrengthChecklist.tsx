import { PASSWORD_RULE_LABELS, getPasswordChecks } from '@/lib/validation';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function PasswordStrengthChecklist({ password }: { password: string }) {
  const theme = useAppTheme();
  const checks = getPasswordChecks(password);

  return (
    <View style={styles.container}>
      {PASSWORD_RULE_LABELS.map(({ key, label }) => {
        const met = checks[key];
        const color = met ? theme.colors.success : theme.colors.textMuted;
        return (
          <View key={key} style={styles.row}>
            <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, marginTop: -4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
});
