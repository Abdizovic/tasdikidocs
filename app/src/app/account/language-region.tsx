import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { AccountMenuSection } from '@/components/account/AccountMenuSection';
import { Card, ScreenContainer } from '@/components/ui';
import { usePreferences } from '@/context/PreferencesContext';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'zh', label: '中文' },
];

const TIMEZONES = [
  'Africa/Nairobi',
  'Africa/Lagos',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
];

export default function LanguageRegionScreen() {
  const theme = useAppTheme();
  const { language, setLanguage, timezone, setTimezone } = usePreferences();

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Language & Region" description="These preferences are saved on this device." />

      <AccountMenuSection title="Language">
        <Card style={{ padding: 0, overflow: 'hidden', borderWidth: 0 }}>
          {LANGUAGES.map((l, i) => (
            <SelectRow key={l.code} label={l.label} selected={language === l.code} isLast={i === LANGUAGES.length - 1} onPress={() => setLanguage(l.code)} theme={theme} />
          ))}
        </Card>
      </AccountMenuSection>

      <AccountMenuSection title="Time zone">
        <Card style={{ padding: 0, overflow: 'hidden', borderWidth: 0 }}>
          {TIMEZONES.map((tz, i) => (
            <SelectRow key={tz} label={tz.replace('_', ' ')} selected={timezone === tz} isLast={i === TIMEZONES.length - 1} onPress={() => setTimezone(tz)} theme={theme} />
          ))}
        </Card>
      </AccountMenuSection>
    </ScreenContainer>
  );
}

function SelectRow({
  label,
  selected,
  isLast,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  isLast: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
    >
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '500' },
});
