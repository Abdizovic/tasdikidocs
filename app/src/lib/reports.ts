import { ApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import {
  getAnalytics,
  getAuditLogs,
  listAllCertificates,
  listCertificatesForInstitution,
  listInstitutions,
  listVerificationEventsForInstitution,
} from '@/lib/mockApi';
import { renderReportPdf, type ReportDefinition } from '@/lib/pdfReport';
import { getHistory } from '@/lib/verificationHistory';
import type { AuthSession, VerificationResult } from '@/types';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const DAY_MS = 24 * 60 * 60 * 1000;
// Bounds file size and generation time on large datasets; a section note
// says when rows were left out.
const MAX_TABLE_ROWS = 1000;
const MAX_ACTIVITY_ROWS = 50;

const RESULT_LABELS: Record<VerificationResult, string> = {
  valid: 'Valid',
  invalid: 'Invalid',
  revoked: 'Revoked',
  not_found: 'Not found',
};

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Tables use a short date — formatDate's long month overflows narrow columns.
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function limitRows<T>(items: T[], limit: number): { items: T[]; note?: string } {
  if (items.length <= limit) return { items };
  return {
    items: items.slice(0, limit),
    note: `Showing the first ${limit.toLocaleString()} of ${items.length.toLocaleString()} records.`,
  };
}

async function buildInstitutionReport(session: AuthSession, generatedAt: Date): Promise<ReportDefinition> {
  const { profile, institution } = session;
  if (!institution) throw new ApiError('No institution is linked to this account.', 'no_institution');

  const [certificates, events] = await Promise.all([
    listCertificatesForInstitution(institution.id),
    listVerificationEventsForInstitution(institution.id),
  ]);

  const active = certificates.filter((c) => c.status === 'active').length;
  const last30Days = events.filter((e) => generatedAt.getTime() - new Date(e.created_at).getTime() <= 30 * DAY_MS).length;
  const certs = limitRows(certificates, MAX_TABLE_ROWS);

  return {
    title: 'Institution Report',
    subtitle: institution.institution_name,
    meta: [
      ['Registration number', institution.registration_number],
      ['Country', institution.country],
      ['Account status', titleCase(institution.status)],
      ['Prepared for', `${profile.full_name} (${profile.email})`],
      ['Generated', formatDateTime(generatedAt.toISOString())],
    ],
    stats: [
      { label: 'Certificates issued', value: certificates.length },
      { label: 'Active', value: active },
      { label: 'Revoked', value: certificates.length - active },
      { label: 'Verifications (30 days)', value: last30Days },
    ],
    sections: [
      {
        title: 'Certificates',
        note: certs.note,
        table: {
          columns: [
            { header: 'Student', width: 0.24 },
            { header: 'Reg. number', width: 0.2 },
            { header: 'Course', width: 0.28 },
            { header: 'Issued', width: 0.15 },
            { header: 'Status', width: 0.13 },
          ],
          rows: certs.items.map((c) => [
            c.student_name,
            c.registration_number,
            c.course_name,
            shortDate(c.issue_date),
            titleCase(c.status),
          ]),
          statusColumn: 4,
          emptyText: 'No certificates have been issued yet.',
        },
      },
      {
        title: 'Recent verification checks',
        note: events.length > MAX_ACTIVITY_ROWS ? `Showing the ${MAX_ACTIVITY_ROWS} most recent checks.` : undefined,
        table: {
          columns: [
            { header: 'Checked', width: 0.28 },
            { header: 'Searched value', width: 0.52 },
            { header: 'Result', width: 0.2 },
          ],
          rows: events
            .slice(0, MAX_ACTIVITY_ROWS)
            .map((e) => [formatDateTime(e.created_at), e.searched_value, RESULT_LABELS[e.result]]),
          statusColumn: 2,
          emptyText: 'No one has verified your certificates yet.',
        },
      },
    ],
    footer: `TasdikiDocs · ${institution.institution_name} · Generated ${formatDateTime(generatedAt.toISOString())}`,
  };
}

async function buildAdminReport(session: AuthSession, generatedAt: Date): Promise<ReportDefinition> {
  const { profile } = session;
  const [analytics, institutions, certificates, auditLogs] = await Promise.all([
    getAnalytics(),
    listInstitutions(),
    listAllCertificates(),
    getAuditLogs(),
  ]);

  const insts = limitRows(institutions, MAX_TABLE_ROWS);
  const certs = limitRows(certificates, MAX_TABLE_ROWS);

  return {
    title: 'Platform Report',
    subtitle: 'Institutions, certificates and administrative activity',
    meta: [
      ['Prepared by', `${profile.full_name} (${profile.email})`],
      ['Role', 'Platform Administrator'],
      ['Generated', formatDateTime(generatedAt.toISOString())],
      ['Scope', 'All institutions and certificates'],
    ],
    stats: [
      { label: 'Institutions', value: analytics.total_institutions },
      { label: 'Pending review', value: analytics.pending_institutions },
      { label: 'Certificates issued', value: analytics.total_certificates },
      { label: 'Active certificates', value: analytics.active_certificates },
      { label: 'Revoked certificates', value: analytics.revoked_certificates },
      { label: 'Verifications (30 days)', value: analytics.verifications_last_30_days },
    ],
    sections: [
      {
        title: 'Institutions',
        note: insts.note,
        table: {
          columns: [
            { header: 'Institution', width: 0.3 },
            { header: 'Reg. number', width: 0.2 },
            { header: 'Country', width: 0.16 },
            { header: 'Applied', width: 0.17 },
            { header: 'Status', width: 0.17 },
          ],
          rows: insts.items.map((i) => [
            i.institution_name,
            i.registration_number,
            i.country,
            shortDate(i.created_at),
            titleCase(i.status),
          ]),
          statusColumn: 4,
          emptyText: 'No institutions have applied yet.',
        },
      },
      {
        title: 'Certificates',
        note: certs.note,
        table: {
          columns: [
            { header: 'Student', width: 0.22 },
            { header: 'Institution', width: 0.24 },
            { header: 'Course', width: 0.24 },
            { header: 'Issued', width: 0.16 },
            { header: 'Status', width: 0.14 },
          ],
          rows: certs.items.map((c) => [
            c.student_name,
            c.institution_name,
            c.course_name,
            shortDate(c.issue_date),
            titleCase(c.status),
          ]),
          statusColumn: 4,
          emptyText: 'No certificates have been issued on the platform yet.',
        },
      },
      {
        title: 'Recent administrative activity',
        note: auditLogs.length > MAX_ACTIVITY_ROWS ? `Showing the ${MAX_ACTIVITY_ROWS} most recent entries.` : undefined,
        table: {
          columns: [
            { header: 'When', width: 0.26 },
            { header: 'Actor', width: 0.3 },
            { header: 'Action', width: 0.44 },
          ],
          rows: auditLogs
            .slice(0, MAX_ACTIVITY_ROWS)
            .map((log) => [formatDateTime(log.created_at), log.actor_name, titleCase(log.action)]),
          emptyText: 'No administrative activity recorded yet.',
        },
      },
    ],
    footer: `TasdikiDocs · Platform report · Generated ${formatDateTime(generatedAt.toISOString())}`,
  };
}

async function buildVerifierReport(session: AuthSession, generatedAt: Date): Promise<ReportDefinition> {
  const { profile } = session;
  const history = await getHistory();
  const count = (...results: VerificationResult[]) => history.filter((e) => results.includes(e.result)).length;

  return {
    title: 'Verification Report',
    subtitle: profile.full_name,
    meta: [
      ['Prepared for', `${profile.full_name} (${profile.email})`],
      ['Account type', 'Verifier'],
      ['Generated', formatDateTime(generatedAt.toISOString())],
      ['Source', 'Verification history on this device'],
    ],
    stats: [
      { label: 'Total checks', value: history.length },
      { label: 'Valid', value: count('valid') },
      { label: 'Revoked', value: count('revoked') },
      { label: 'Invalid or not found', value: count('invalid', 'not_found') },
    ],
    sections: [
      {
        title: 'Verification history',
        note: 'History is kept on this device and includes up to your 25 most recent checks.',
        table: {
          columns: [
            { header: 'Checked', width: 0.26 },
            { header: 'Certificate / search', width: 0.3 },
            { header: 'Student', width: 0.26 },
            { header: 'Result', width: 0.18 },
          ],
          rows: history.map((e) => [formatDateTime(e.checkedAt), e.query, e.studentName ?? '-', RESULT_LABELS[e.result]]),
          statusColumn: 3,
          emptyText: 'You have not verified any certificates on this device yet.',
        },
      },
    ],
    footer: `TasdikiDocs · Verification report · Generated ${formatDateTime(generatedAt.toISOString())}`,
  };
}

function buildReport(session: AuthSession, generatedAt: Date): Promise<ReportDefinition> {
  switch (session.profile.role) {
    case 'admin':
      return buildAdminReport(session, generatedAt);
    case 'institution':
      return buildInstitutionReport(session, generatedAt);
    default:
      return buildVerifierReport(session, generatedAt);
  }
}

async function saveReport(bytes: Uint8Array, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Copy into a plain ArrayBuffer; Blob's typings reject views over ArrayBufferLike.
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError('Saving files is not available on this device.', 'sharing_unavailable');
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share report' });
}

/** Builds the signed-in user's role-specific report and hands it to the OS save/share sheet (or downloads it on web). */
export async function downloadReport(session: AuthSession): Promise<void> {
  const generatedAt = new Date();
  const report = await buildReport(session, generatedAt);
  const bytes = await renderReportPdf(report);
  const fileName = `tasdikidocs-${session.profile.role}-report-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  await saveReport(bytes, fileName);
}
