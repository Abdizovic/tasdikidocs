import { Button, Card, EmptyState, InlineAlert, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { parseCsv, toCsv } from '@/lib/csv';
import { bulkIssueCertificates, type BulkIssueResult, type IssueCertificateInput } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Stack, router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const TEMPLATE_HEADER = ['studentName', 'registrationNumber', 'courseName', 'grade', 'issueDate'];
const TEMPLATE_EXAMPLE = ['Brian Kiprotich', 'NIT/CS/2024/0001', 'BSc. Computer Science', 'First Class Honours', '2026-07-01'];

interface ParsedRow {
  input: IssueCertificateInput;
  error: string | null;
}

function validateRow(input: IssueCertificateInput): string | null {
  if (!input.studentName || !input.registrationNumber || !input.courseName || !input.issueDate) {
    return 'Missing required field(s).';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issueDate)) {
    return 'issueDate must be YYYY-MM-DD.';
  }
  return null;
}

export default function BulkIssueScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const institution = session!.institution!;

  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkIssueResult | null>(null);

  async function handleDownloadTemplate() {
    setError(null);
    setDownloading(true);
    try {
      const file = new File(Paths.cache, 'tasdikidocs-bulk-issue-template.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(toCsv([TEMPLATE_HEADER, TEMPLATE_EXAMPLE]));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Save certificate template' });
      } else {
        setError(`Template saved to ${file.uri}`);
      }
    } catch {
      setError('Could not generate the template file.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload() {
    setError(null);
    setUploading(true);
    try {
      const picked = await File.pickFileAsync();
      if (picked.canceled) return;
      const text = await picked.result.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError('The file has no data rows below the header.');
        return;
      }
      const dataRows = parsed.slice(1);
      const parsedRows: ParsedRow[] = dataRows.map((cols) => {
        const input: IssueCertificateInput = {
          studentName: (cols[0] ?? '').trim(),
          registrationNumber: (cols[1] ?? '').trim(),
          courseName: (cols[2] ?? '').trim(),
          grade: (cols[3] ?? '').trim() || undefined,
          issueDate: (cols[4] ?? '').trim(),
        };
        return { input, error: validateRow(input) };
      });
      setRows(parsedRows);
    } catch {
      setError('Could not read that file. Make sure it is a CSV exported from the template.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!rows) return;
    setSubmitting(true);
    try {
      const validRows = rows.filter((r) => !r.error).map((r) => r.input);
      const res = await bulkIssueCertificates(institution, validRows);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: 'Import Complete' }} />
        <View style={styles.resultWrap}>
          <View style={[styles.circle, { backgroundColor: result.failed.length ? theme.colors.warningBg : theme.colors.successBg }]}>
            <Ionicons
              name={result.failed.length ? 'alert-circle' : 'checkmark-circle'}
              size={40}
              color={result.failed.length ? theme.colors.warning : theme.colors.success}
            />
          </View>
          <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
            {result.success.length} certificate{result.success.length === 1 ? '' : 's'} issued
          </Text>
          {result.failed.length > 0 ? (
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]}>
              {result.failed.length} row{result.failed.length === 1 ? '' : 's'} could not be issued
            </Text>
          ) : null}

          {result.failed.length > 0 ? (
            <Card style={{ marginTop: 16, width: '100%', gap: 8 }}>
              {result.failed.map((f) => (
                <Text key={f.row} style={{ color: theme.colors.danger, fontSize: 13 }}>
                  Row {f.row}: {f.reason}
                </Text>
              ))}
            </Card>
          ) : null}

          <Button label="Done" onPress={() => router.replace('/(institution)/certificates')} style={{ marginTop: 24 }} />
        </View>
      </ScreenContainer>
    );
  }

  if (rows) {
    const validCount = rows.filter((r) => !r.error).length;
    return (
      <ScreenContainer scroll={false}>
        <Stack.Screen options={{ headerShown: true, title: 'Review Import' }} />
        <Text style={[styles.summary, { color: theme.colors.text }]}>
          {validCount} of {rows.length} row{rows.length === 1 ? '' : 's'} ready to issue
        </Text>

        <View style={{ flex: 1, gap: 10 }}>
          {rows.map((r, index) => (
            <Card key={index} style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: theme.colors.text }]}>{r.input.studentName || `Row ${index + 1}`}</Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                  {r.input.registrationNumber || '—'} · {r.input.courseName || '—'}
                </Text>
                {r.error ? <Text style={[styles.rowError, { color: theme.colors.danger }]}>{r.error}</Text> : null}
              </View>
              <Ionicons
                name={r.error ? 'close-circle' : 'checkmark-circle'}
                size={20}
                color={r.error ? theme.colors.danger : theme.colors.success}
              />
            </Card>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <Button label="Choose different file" variant="outline" onPress={() => setRows(null)} fullWidth={false} style={{ flex: 1 }} />
          <Button
            label={`Issue ${validCount} certificate${validCount === 1 ? '' : 's'}`}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth={false}
            style={{ flex: 2 }}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: 'Bulk Import' }} />
      {error ? <InlineAlert message={error} /> : null}

      <EmptyState
        icon="cloud-upload-outline"
        title="Issue certificates in bulk"
        description="Download the CSV template, fill in one row per student, then upload it here to issue them all at once."
      >
        <View style={{ gap: 12, marginTop: 20, width: '100%' }}>
          <Button label="Download CSV template" variant="outline" onPress={handleDownloadTemplate} loading={downloading} />
          <Button label="Upload completed CSV" onPress={handleUpload} loading={uploading} />
        </View>
      </EmptyState>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowError: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  resultWrap: { alignItems: 'center', paddingTop: 24 },
  circle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  resultSubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
});
