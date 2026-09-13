import { StyleSheet, View } from 'react-native';
import { TextField } from './TextField';

interface NameFieldsProps {
  firstName: string;
  lastName: string;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
}

export function NameFields({ firstName, lastName, onChangeFirstName, onChangeLastName }: NameFieldsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <TextField
          label="First name"
          placeholder="John"
          value={firstName}
          onChangeText={onChangeFirstName}
          autoCapitalize="words"
          textContentType="givenName"
        />
      </View>
      <View style={styles.field}>
        <TextField
          label="Last name"
          placeholder="Ken"
          value={lastName}
          onChangeText={onChangeLastName}
          autoCapitalize="words"
          textContentType="familyName"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
});
