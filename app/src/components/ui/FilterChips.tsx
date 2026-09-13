import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

export interface FilterOption<T extends string> {
  label: string;
  value: T;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface FilterChipsProps<T extends string> {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

// Single-row, horizontally scrollable pills. The row bleeds past the screen
// gutter so chips scroll edge to edge instead of being clipped at the padding.
export function FilterChips<T extends string>({ options, value, onChange, style }: FilterChipsProps<T>) {
  const theme = useAppTheme();
  const gutter = theme.spacing.xl;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={[styles.scroll, { marginHorizontal: -gutter }, style]}
      contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const fg = selected ? theme.colors.onPrimary : theme.colors.textSecondary;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radii.full,
                opacity: pressed ? 0.8 : 1,
              },
              selected && styles.chipSelected,
            ]}
          >
            {option.icon ? <Ionicons name={option.icon} size={15} color={fg} /> : null}
            <Text style={[styles.label, { color: fg }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Horizontal ScrollViews default to flexGrow: 1, which stretches the row
  // vertically inside a column layout.
  scroll: { flexGrow: 0 },
  row: { gap: 8, alignItems: 'center', paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  chipSelected: Platform.select({
    ios: { shadowColor: '#2E73F5', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 3 },
    default: {},
  }),
  label: { fontSize: 13, fontWeight: '600' },
});
