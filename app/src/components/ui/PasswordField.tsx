import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps } from 'react-native';
import { TextField } from './TextField';

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string | null;
  helperText?: string;
}

// Password input with an open/closed eye icon so the user can toggle
// plaintext visibility of what they typed.
export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  { label = 'Password', error, helperText, ...rest },
  ref,
) {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      ref={ref}
      label={label}
      error={error}
      helperText={helperText}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      rightElement={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={{ padding: 10 }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      }
      {...rest}
    />
  );
});
