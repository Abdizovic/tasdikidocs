import { Button, InlineAlert, ScreenContainer, TextField } from '@/components/ui';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SearchScreen() {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSearch() {
    if (!query.trim()) {
      setError('Enter a certificate ID or registration number.');
      return;
    }
    router.push({ pathname: '/(verifier)/result', params: { query: query.trim() } });
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Search Certificate' }} />
      <View style={styles.iconWrap}>
        <View style={[styles.circle, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name="search-outline" size={28} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
        Enter certificate details
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Search by the certificate ID, registration number, or certificate hash printed on the document.
      </Text>

      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        <TextField
          placeholder="e.g. NIT/CS/2021/0456"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={handleSearch}
        />
        <Button label="Verify certificate" onPress={handleSearch} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  form: { gap: 16 },
});
