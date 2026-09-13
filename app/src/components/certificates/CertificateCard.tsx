import { formatDate, truncateMiddle } from '@/lib/format';
import { verifyDeepLink } from '@/lib/links';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Certificate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

function isUploadedDocument(uri: string | null): boolean {
  return !!uri && (uri.startsWith('file:') || uri.startsWith('http') || uri.startsWith('content:'));
}

// The visual "digital certificate" shown to verifiers, institutions, and
// admins alike. If the institution attached a real document/photo at
// issuance (certificate.ipfs_uri), that image is the certificate; otherwise
// this renders a diploma-styled layout generated from the structured data.
export function CertificateCard({ certificate }: { certificate: Certificate }) {
  const theme = useAppTheme();

  if (isUploadedDocument(certificate.ipfs_uri)) {
    return (
      <View style={[styles.outer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg }]}>
        <Image source={{ uri: certificate.ipfs_uri! }} style={styles.documentImage} resizeMode="contain" />
        <View style={styles.documentFooter}>
          <Ionicons name="finger-print-outline" size={12} color={theme.colors.textMuted} />
          <Text style={[styles.hash, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {truncateMiddle(certificate.certificate_hash, 10, 8)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.outer, { borderColor: theme.colors.primaryDark, backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg }]}>
      <View style={[styles.inner, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={28} color={theme.colors.primaryDark} />
          <Text style={[styles.eyebrow, { color: theme.colors.primaryDark }]}>CERTIFICATE OF COMPLETION</Text>
          <Text style={[styles.issuer, { color: theme.colors.textSecondary }]}>{certificate.institution_name}</Text>
        </View>

        <View style={styles.body}>
          <Text style={[styles.lead, { color: theme.colors.textMuted }]}>This certifies that</Text>
          <Text style={[styles.studentName, { color: theme.colors.text }]}>{certificate.student_name}</Text>
          <Text style={[styles.lead, { color: theme.colors.textMuted }]}>has successfully completed</Text>
          <Text style={[styles.courseName, { color: theme.colors.text }]}>{certificate.course_name}</Text>
          {certificate.grade ? (
            <Text style={[styles.grade, { color: theme.colors.primaryDark }]}>{certificate.grade}</Text>
          ) : null}
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>{formatDate(certificate.issue_date)}</Text>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <View>
            <Text style={[styles.footerLabel, { color: theme.colors.textMuted }]}>Registration number</Text>
            <Text style={[styles.footerValue, { color: theme.colors.text }]}>{certificate.registration_number}</Text>
            <Text style={[styles.footerLabel, { color: theme.colors.textMuted, marginTop: 6 }]}>Certificate ID</Text>
            <Text style={[styles.footerValue, { color: theme.colors.text }]}>{truncateMiddle(certificate.id, 10, 4)}</Text>
          </View>
          <QRCode value={verifyDeepLink(certificate.id)} size={64} color={theme.colors.text} backgroundColor="transparent" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderWidth: 1.5, padding: 6 },
  inner: { borderWidth: 1, borderStyle: 'dashed', padding: 20, gap: 18 },
  header: { alignItems: 'center', gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 6 },
  issuer: { fontSize: 12, fontWeight: '600' },
  body: { alignItems: 'center', gap: 4 },
  lead: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  studentName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  courseName: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  grade: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  date: { fontSize: 12, marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 14 },
  footerLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  footerValue: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  documentImage: { width: '100%', aspectRatio: 1.4, borderRadius: 8 },
  documentFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4 },
  hash: { fontSize: 11, fontFamily: 'monospace' },
});
