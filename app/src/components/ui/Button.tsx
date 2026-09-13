import { useAppTheme } from '@/theme/useAppTheme';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  style,
  testID,
}: ButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  const palette = useMemo(() => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: 'transparent' };
      case 'secondary':
        return { bg: theme.colors.primaryDark, fg: theme.colors.onPrimary, border: 'transparent' };
      case 'danger':
        return { bg: theme.colors.danger, fg: theme.colors.onPrimary, border: 'transparent' };
      case 'outline':
        return { bg: 'transparent', fg: theme.colors.primary, border: theme.colors.primary };
      case 'ghost':
        return { bg: 'transparent', fg: theme.colors.primary, border: 'transparent' };
    }
  }, [variant, theme]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radii.md,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              { color: palette.fg, fontSize: theme.typography.size.md, marginLeft: icon ? 8 : 0 },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
