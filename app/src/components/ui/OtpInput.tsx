import { useAppTheme } from '@/theme/useAppTheme';
import { useRef } from 'react';
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData, View } from 'react-native';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function OtpInput({ length = 6, value, onChange, autoFocus }: OtpInputProps) {
  const theme = useAppTheme();
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setDigit(index: number, digit: string) {
    const clean = digit.replace(/[^0-9]/g, '');
    const chars = value.split('');
    if (clean.length > 1) {
      // Handles paste of the full code into one box.
      onChange(clean.slice(0, length));
      inputs.current[Math.min(clean.length, length) - 1]?.focus();
      return;
    }
    chars[index] = clean;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (clean && index < length - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyPress(index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          value={digit}
          onChangeText={(t) => setDigit(index, t)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus={autoFocus && index === 0}
          style={[
            styles.box,
            {
              borderColor: digit ? theme.colors.primary : theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
              fontSize: theme.typography.size.xl,
            },
          ]}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    fontWeight: '700',
  },
});
