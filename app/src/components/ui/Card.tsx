import { useAppTheme } from '@/theme/useAppTheme';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';

export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.lg,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#0A1730', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 },
      default: {},
    }),
  },
});
