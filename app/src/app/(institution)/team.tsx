import { Button, Card, EmptyState, InlineAlert, NameFields, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { formatDate, initials } from '@/lib/format';
import { isValidEmail } from '@/lib/validation';
import { inviteInstitutionMember, listInstitutionMembers, removeInstitutionMember } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { InstitutionMember } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function TeamScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session!.institution!;

  const [members, setMembers] = useState<InstitutionMember[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState<{ email: string; tempPassword: string } | null>(null);

  const load = useCallback(() => {
    listInstitutionMembers(institution.id).then(setMembers);
  }, [institution.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const me = members?.find((m) => m.profile_id === session!.profile.id);
  const isOwner = me?.role === 'owner';

  async function handleInvite() {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address, e.g. name@domain.com.');
      return;
    }
    setLoading(true);
    try {
      const { tempPassword } = await inviteInstitutionMember(institution.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      setInvited({ email: email.trim(), tempPassword });
      setFirstName('');
      setLastName('');
      setEmail('');
      setInviting(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(profileId: string) {
    await removeInstitutionMember(institution.id, profileId);
    load();
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xxl }]}>Team</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        People who can sign in and issue certificates on behalf of {institution.institution_name}.
      </Text>

      {invited ? (
        <Card style={[styles.revealCard, { borderColor: theme.colors.warning }]}>
          <Text style={[styles.revealLabel, { color: theme.colors.warningDark }]}>
            Share this temporary password with {invited.email} — it won’t be shown again
          </Text>
          <Text selectable style={[styles.revealPassword, { color: theme.colors.text }]}>
            {invited.tempPassword}
          </Text>
          <Button label="Done" variant="outline" onPress={() => setInvited(null)} />
        </Card>
      ) : null}

      {!members ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <View style={{ gap: 12, marginBottom: 24 }}>
          {members.map((m) => (
            <Card key={m.profile_id} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primaryDark }]}>
                <Text style={styles.avatarText}>{initials(m.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.colors.text }]}>{m.full_name}</Text>
                <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{m.email}</Text>
                <Text style={[styles.since, { color: theme.colors.textMuted }]}>Since {formatDate(m.invited_at)}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: m.role === 'owner' ? theme.colors.infoBg : theme.colors.surfaceAlt, borderRadius: theme.radii.full },
                ]}
              >
                <Text style={{ color: m.role === 'owner' ? theme.colors.info : theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                  {m.role === 'owner' ? 'Owner' : 'Staff'}
                </Text>
              </View>
              {isOwner && m.role === 'staff' ? (
                <Pressable onPress={() => handleRemove(m.profile_id)} hitSlop={10}>
                  <Ionicons name="close-circle-outline" size={20} color={theme.colors.danger} />
                </Pressable>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {isOwner ? (
        inviting ? (
          <Card style={{ gap: 14 }}>
            {error ? <InlineAlert message={error} /> : null}
            <NameFields firstName={firstName} lastName={lastName} onChangeFirstName={setFirstName} onChangeLastName={setLastName} />
            <TextField label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
            <View style={styles.buttonRow}>
              <Button label="Cancel" variant="outline" onPress={() => setInviting(false)} fullWidth={false} style={{ flex: 1 }} />
              <Button label="Send invite" onPress={handleInvite} loading={loading} fullWidth={false} style={{ flex: 2 }} />
            </View>
          </Card>
        ) : (
          <Button
            label="Invite team member"
            icon={<Ionicons name="person-add-outline" size={18} color={theme.colors.onPrimary} />}
            onPress={() => setInviting(true)}
          />
        )
      ) : members && members.length > 0 ? (
        <EmptyState icon="lock-closed-outline" title="Only the owner can manage the team" />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  revealCard: { borderWidth: 1.5, gap: 10, marginBottom: 20 },
  revealLabel: { fontSize: 12, fontWeight: '700' },
  revealPassword: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 2 },
  since: { fontSize: 11, marginTop: 3 },
  roleBadge: { paddingVertical: 4, paddingHorizontal: 10 },
  buttonRow: { flexDirection: 'row', gap: 12 },
});
