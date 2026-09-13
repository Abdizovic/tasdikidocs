import { CertificateCard } from '@/components/certificates/CertificateCard';
import { Button, InlineAlert, ScreenContainer, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { issueCertificate } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function IssueCertificateScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session!.institution!;

  const [studentName, setStudentName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<Certificate | null>(null);

  async function handlePickDocument() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to attach the certificate document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setDocumentUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!studentName.trim() || !registrationNumber.trim() || !courseName.trim() || !issueDate.trim()) {
      setError('Student name, registration number, course, and issue date are required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate.trim())) {
      setError('Issue date must be in YYYY-MM-DD format.');
      return;
    }
    setLoading(true);
    try {
      const cert = await issueCertificate(institution, {
        studentName: studentName.trim(),
        registrationNumber: registrationNumber.trim(),
        courseName: courseName.trim(),
        grade: grade.trim() || undefined,
        issueDate: issueDate.trim(),
        documentUri: documentUri ?? undefined,
      });
      setIssued(cert);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (issued) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: 'Certificate Issued' }} />
        <View style={styles.successWrap}>
          <View style={[styles.circle, { backgroundColor: theme.colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.size.xl }]}>
            Certificate issued
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Share this with {issued.student_name} for instant verification.
          </Text>

          <View style={{ marginTop: 20, alignSelf: 'stretch' }}>
            <CertificateCard certificate={issued} />
          </View>

          <Text style={[styles.pendingChainNote, { color: theme.colors.textMuted }]}>
            Blockchain anchoring pending (mock mode) — will mint on-chain once Thirdweb is connected.
          </Text>

          <Button label="Done" onPress={() => router.replace('/(institution)/certificates')} style={{ marginTop: 24 }} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Issue Certificate' }} />
      <View style={styles.form}>
        {error ? <InlineAlert message={error} /> : null}
        <TextField label="Student full name" placeholder="Brian Kiprotich" value={studentName} onChangeText={setStudentName} autoCapitalize="words" />
        <TextField
          label="Registration / index number"
          placeholder="NIT/CS/2024/0001"
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
          autoCapitalize="characters"
        />
        <TextField label="Course / programme" placeholder="BSc. Computer Science" value={courseName} onChangeText={setCourseName} />
        <TextField label="Grade / classification (optional)" placeholder="First Class Honours" value={grade} onChangeText={setGrade} />
        <TextField label="Issue date" placeholder="YYYY-MM-DD" value={issueDate} onChangeText={setIssueDate} keyboardType="numbers-and-punctuation" />

        <View>
          <Text style={[styles.label, { color: theme.colors.text }]}>Attach certificate document (optional)</Text>
          {documentUri ? (
            <View style={styles.documentPreviewWrap}>
              <Image source={{ uri: documentUri }} style={styles.documentPreview} />
              <Pressable
                onPress={() => setDocumentUri(null)}
                style={[styles.removeBadge, { backgroundColor: theme.colors.danger, borderColor: theme.colors.background }]}
              >
                <Ionicons name="close" size={14} color={theme.colors.onPrimary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickDocument}
              style={[styles.attachButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.md }]}
            >
              <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.attachButtonText, { color: theme.colors.primary }]}>Upload a photo of the certificate</Text>
            </Pressable>
          )}
          <Text style={[styles.helper, { color: theme.colors.textMuted }]}>
            If skipped, TasdikiDocs generates a certificate card from the details above.
          </Text>
        </View>

        <Button label="Issue certificate" onPress={handleSubmit} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  helper: { fontSize: 11, marginTop: 6 },
  attachButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 18 },
  attachButtonText: { fontSize: 13, fontWeight: '700' },
  documentPreviewWrap: { alignSelf: 'flex-start' },
  documentPreview: { width: 140, height: 100, borderRadius: 10 },
  removeBadge: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  successWrap: { alignItems: 'stretch', gap: 8, paddingTop: 16 },
  circle: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  pendingChainNote: { fontSize: 11, textAlign: 'center', marginTop: 12 },
});
