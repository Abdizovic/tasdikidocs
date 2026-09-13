import { COUNTRIES, type Country } from '@/data/countries';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  showDialCode?: boolean;
  title?: string;
}

export function CountryPickerModal({ visible, onClose, onSelect, showDialCode, title = 'Select a country' }: CountryPickerModalProps) {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q));
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchRow,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text }]}
            autoFocus
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                setQuery('');
                onClose();
              }}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent' }]}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
              {showDialCode ? <Text style={[styles.dialCode, { color: theme.colors.textMuted }]}>{item.dialCode}</Text> : null}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, paddingHorizontal: 12, height: 44, borderWidth: 1.5, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  flag: { fontSize: 22 },
  name: { flex: 1, fontSize: 15, fontWeight: '500' },
  dialCode: { fontSize: 14, fontWeight: '600' },
});
