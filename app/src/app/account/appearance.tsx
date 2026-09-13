import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { Card, ScreenContainer } from '@/components/ui';
import { usePreferences, type ThemeMode } from '@/context/PreferencesContext';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline', description: 'Always use light appearance' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline', description: 'Always use dark appearance' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline', description: 'Match your device setting' },
];

export default function AppearanceScreen() {
  const theme = useAppTheme();
  const { themeMode, setThemeMode } = usePreferences();

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Appearance" description="Choose how TasdikiDocs looks on this device." />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {OPTIONS.map((opt, index) => {
          const selected = themeMode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setThemeMode(opt.value)}
              style={[styles.row, index < OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            >
              <Ionicons name={opt.icon} size={20} color={selected ? theme.colors.primary : theme.colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.colors.text }]}>{opt.label}</Text>
                <Text style={[styles.description, { color: theme.colors.textMuted }]}>{opt.description}</Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} /> : null}
            </Pressable>
          );
        })}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '600' },
  description: { fontSize: 12, marginTop: 2 },
});
