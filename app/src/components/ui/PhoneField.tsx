import { COUNTRIES, DEFAULT_COUNTRY, type Country } from '@/data/countries';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CountryPickerModal } from './CountryPickerModal';

interface PhoneFieldProps {
  label?: string;
  value: string; // full international string, e.g. "+254712345678"
  onChange: (fullNumber: string) => void;
  error?: string | null;
  helperText?: string;
  placeholder?: string;
}

function splitPhone(value: string): { country: Country; localNumber: string } {
  if (value) {
    const byLongestDialCode = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match = byLongestDialCode.find((c) => value.startsWith(c.dialCode));
    if (match) return { country: match, localNumber: value.slice(match.dialCode.length) };
  }
  return { country: DEFAULT_COUNTRY, localNumber: value.replace(/^\+/, '') };
}

export function PhoneField({ label = 'Phone number', value, onChange, error, helperText, placeholder }: PhoneFieldProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [{ country, localNumber }, setState] = useState(() => splitPhone(value));

  function updateCountry(next: Country) {
    setState({ country: next, localNumber });
    onChange(`${next.dialCode}${localNumber}`);
  }

  function updateLocalNumber(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setState({ country, localNumber: digitsOnly });
    onChange(`${country.dialCode}${digitsOnly}`);
  }

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.text, fontSize: theme.typography.size.sm }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.row,
          { borderColor: error ? theme.colors.danger : theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md },
        ]}
      >
        <Pressable onPress={() => setOpen(true)} style={styles.chip}>
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.dialCode, { color: theme.colors.text }]}>{country.dialCode}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <TextInput
          value={localNumber}
          onChangeText={updateLocalNumber}
          placeholder={placeholder ?? '712 345 678'}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
          style={[styles.input, { color: theme.colors.text, fontSize: theme.typography.size.md }]}
        />
      </View>
      {error ? (
        <Text style={[styles.helper, { color: theme.colors.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>{helperText}</Text>
      ) : null}

      <CountryPickerModal visible={open} onClose={() => setOpen(false)} onSelect={updateCountry} showDialCode title="Select dialing code" />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderWidth: 1.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  flag: { fontSize: 18 },
  dialCode: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, height: 26 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  helper: { marginTop: 6, fontSize: 12 },
});
