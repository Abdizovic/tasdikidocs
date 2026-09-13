import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function BrandMark({ size = 64, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.iconWrap,
          { width: size, height: size, borderRadius: size / 3.2, backgroundColor: theme.colors.primaryDark },
        ]}
      >
        <Ionicons name="shield-checkmark" size={size * 0.55} color={theme.colors.onPrimary} />
      </View>
      {showWordmark ? (
        <Text style={[styles.wordmark, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
          TasdikiDocs
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontWeight: '800', letterSpacing: 0.2 },
});
