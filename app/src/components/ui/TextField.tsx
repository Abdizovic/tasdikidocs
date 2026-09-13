import { useAppTheme } from '@/theme/useAppTheme';
import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, helperText, leftIcon, rightElement, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.colors.danger : focused ? theme.colors.primary : theme.colors.border;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.text, fontSize: theme.typography.size.sm }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            { color: theme.colors.text, fontSize: theme.typography.size.md },
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.helper, { color: theme.colors.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 50,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  rightElement: {
    paddingRight: 6,
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
  },
});
