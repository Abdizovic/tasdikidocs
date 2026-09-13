import { findCountryByName } from '@/data/countries';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CountryPickerModal } from './CountryPickerModal';

interface CountryFieldProps {
  label?: string;
  value: string;
  onChange: (countryName: string) => void;
  error?: string | null;
}

export function CountryField({ label = 'Country', value, onChange, error }: CountryFieldProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = findCountryByName(value);

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.text, fontSize: theme.typography.size.sm }]}>{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: error ? theme.colors.danger : theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        {selected ? (
          <Text style={styles.flag}>{selected.flag}</Text>
        ) : (
          <Ionicons name="earth-outline" size={18} color={theme.colors.textMuted} />
        )}
        <Text style={[styles.value, { color: value ? theme.colors.text : theme.colors.textMuted }]}>
          {value || 'Select your country'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
      </Pressable>
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

      <CountryPickerModal
        visible={open}
        onClose={() => setOpen(false)}
        onSelect={(country) => onChange(country.name)}
        title="Select your country"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontWeight: '600' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, borderWidth: 1.5, paddingHorizontal: 14 },
  flag: { fontSize: 20 },
  value: { flex: 1, fontSize: 15 },
  error: { marginTop: 6, fontSize: 12 },
});
