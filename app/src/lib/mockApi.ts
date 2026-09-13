// The single seam between the UI and "the backend". Auth (sign in/up,
// session, password/email changes) talks directly to Supabase via
// src/lib/supabase.ts — that's the standard pattern for a Supabase-backed
// mobile app and lets RLS do the access-control work. Privileged/aggregate
// business logic (institutions, certificates, admin analytics/audit logs)
// goes through the Express layer via src/lib/apiClient.ts. Notifications
// read/mark-as-read the same way as profiles (direct to Supabase, RLS-
// scoped). A handful of Account Settings features below (sessions, API
// keys, multi-staff teams, support tickets) have no real backend yet and
// remain mock-backed, clearly marked in the section comment below.

import { api } from '@/lib/apiClient';
import { ApiError } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';
import { apiKeysByProfile, findUserByEmail, institutionMembers, nextId, sessionsByProfile, users, verificationEvents } from '@/lib/mockDb';
import type {
  AnalyticsSnapshot,
  ApiKey,
  AppNotification,
  AuditLogEntry,
  AuthSession,
  Certificate,
  CertificateStatus,
  DeviceSession,
  Institution,
  InstitutionMember,
  Profile,
  VerificationEvent,
  VerificationResponse,
} from '@/types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Auth — talks directly to Supabase Auth + the profiles/institutions tables
// (RLS-scoped to the caller's own row), never through Express.
// ---------------------------------------------------------------------------

async function fetchProfile(profileId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();
  if (error || !data) throw new ApiError('Could not load your profile.', 'not_found');
  return data as Profile;
}

async function fetchOwnInstitution(profileId: string): Promise<Institution | null> {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 'unknown_error');
  return (data as Institution) ?? null;
}

async function sessionFromSupabase(accessToken: string, userId: string): Promise<AuthSession> {
  const profile = await fetchProfile(userId);
  const institution = profile.role === 'institution' ? await fetchOwnInstitution(userId) : null;

  if (institution?.deactivated_at) {
    await supabase.auth.signOut();
    throw new ApiError('This institution account has been deactivated.', 'account_deactivated');
  }

  return { profile, institution, token: accessToken };
}

function mapSignUpError(error: { message: string }): never {
  if (error.message.toLowerCase().includes('already registered')) {
    throw new ApiError('An account with this email already exists.', 'email_taken');
  }
  throw new ApiError(error.message, 'unknown_error');
}

// Supabase's signInWithPassword has no client-visible lockout/retry-after
// concept, so this client-side counter is what actually drives the
// "too many attempts" countdown UX — a real feature, not a mock stand-in.
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_DURATION_MS = 60_000;
const loginAttemptsByEmail: Record<string, { count: number; lockedUntil: number | null }> = {};

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const key = email.trim().toLowerCase();
  const attempt = loginAttemptsByEmail[key];

  if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    throw new ApiError(`Too many failed attempts. Try again in ${retryAfterSeconds}s.`, 'locked', retryAfterSeconds);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    const nextCount = (attempt?.count ?? 0) + 1;
    if (nextCount >= LOGIN_LOCKOUT_THRESHOLD) {
      loginAttemptsByEmail[key] = { count: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_DURATION_MS };
      throw new ApiError('Too many failed attempts. Try again in 60s.', 'locked', 60);
    }
    loginAttemptsByEmail[key] = { count: nextCount, lockedUntil: null };
    throw new ApiError('Invalid email or password.', 'invalid_credentials');
  }

  delete loginAttemptsByEmail[key];

  // A verified TOTP factor means Supabase only issued an aal1 session —
  // it can't be turned into an AuthSession until the second factor is
  // verified too (see completeMfaLogin). The (still aal1) Supabase session
  // is left in place so that verification can proceed without asking for
  // the password again.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === 'verified');
    if (factor) {
      throw new ApiError('Enter your two-factor authentication code to continue.', 'mfa_required', undefined, factor.id);
    }
  }

  return sessionFromSupabase(data.session.access_token, data.user.id);
}

export interface SignUpVerifierInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function signUpVerifier(input: SignUpVerifierInput): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: 'verifier',
        first_name: input.firstName,
        last_name: input.lastName,
        full_name: `${input.firstName} ${input.lastName}`.trim(),
        phone: input.phone ?? null,
      },
    },
  });

  if (error) mapSignUpError(error);
  if (!data.session || !data.user) {
    throw new ApiError('Could not create your account. Please try again.', 'unknown_error');
  }

  return sessionFromSupabase(data.session.access_token, data.user.id);
}

export interface InstitutionApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  institutionName: string;
  registrationNumber: string;
  country: string;
  website?: string;
  contactPhone?: string;
}

export async function applyAsInstitution(input: InstitutionApplicationInput): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: 'institution',
        first_name: input.firstName,
        last_name: input.lastName,
        full_name: `${input.firstName} ${input.lastName}`.trim(),
        phone: input.contactPhone ?? null,
      },
    },
  });

  if (error) mapSignUpError(error);
  if (!data.session || !data.user) {
    throw new ApiError('Could not create your account. Please try again.', 'unknown_error');
  }

  // The institution row (always created in "pending" status, enforced
  // server-side) is created via Express, not a direct client insert — see
  // server/src/routes/institutions.routes.ts for why that boundary matters.
  await api.post('/institutions/apply', {
    institution_name: input.institutionName,
    registration_number: input.registrationNumber,
    country: input.country,
    website: input.website || undefined,
    contact_phone: input.contactPhone || undefined,
  });

  // No "application submitted" notification yet — only the admin's
  // approve/reject decision generates one for now (see institutionService
  // on the server); this self-confirmation can be added the same way later.

  return sessionFromSupabase(data.session.access_token, data.user.id);
}

export async function requestPasswordResetOtp(email: string): Promise<{ message: string; devOtp?: string }> {
  // devOtp no longer comes back — the code is emailed for real now. Kept in
  // the return type (always undefined) so screens built for the demo-mode
  // banner don't need changes; the banner just never renders.
  return api.post('/auth/forgot-password', { email });
}

export async function verifyPasswordResetOtp(email: string, code: string): Promise<{ resetToken: string }> {
  try {
    await api.post('/auth/verify-otp', { email, code });
  } catch (e) {
    // Re-map the server's attempt-count lock onto the 'locked' code the
    // verify-otp screen already renders a countdown for.
    if (e instanceof ApiError && e.code === 'otp_locked') {
      throw new ApiError('Too many attempts. Please request a new code.', 'locked');
    }
    throw e;
  }
  // The server re-validates the code itself in resetPassword, so the code
  // can safely double as the "reset token" carried between screens.
  return { resetToken: code };
}

export async function resendPasswordResetOtp(email: string): Promise<{ message: string; devOtp?: string }> {
  return requestPasswordResetOtp(email);
}

export async function resetPassword(email: string, resetToken: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { email, code: resetToken, newPassword });
}

export async function restoreSession(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    // A persisted session that never completed its second factor shouldn't
    // silently grant access on app reopen — treat it as logged out rather
    // than trying to resume mid-MFA-challenge.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      return null;
    }
    return await sessionFromSupabase(data.session.access_token, data.session.user.id);
  } catch {
    return null;
  }
}

export async function signOutSupabase(): Promise<void> {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Two-factor authentication (Supabase Auth MFA, TOTP).
//
// Optional for verifiers; institutions and admins are strongly nudged to
// enable it (see the reminder banner on their dashboards) since they can
// issue certificates / approve institutions — but it isn't a hard login
// gate, since a lost authenticator with no recovery-code flow would
// otherwise permanently lock someone out of the single seeded admin
// account or an institution's own account.
// ---------------------------------------------------------------------------

export interface MfaFactor {
  id: string;
  status: 'verified' | 'unverified';
  createdAt: string;
}

export async function listMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new ApiError(error.message, 'unknown_error');
  return (data?.totp ?? []).map((f) => ({ id: f.id, status: f.status, createdAt: f.created_at }));
}

export interface MfaEnrollment {
  factorId: string;
  secret: string;
  uri: string;
}

export async function enrollMfaFactor(): Promise<MfaEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw new ApiError(error.message, 'unknown_error');
  return { factorId: data.id, secret: data.totp.secret, uri: data.totp.uri };
}

async function challengeAndVerifyFactor(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw new ApiError('That code is invalid or has expired.', 'invalid_otp');
}

export async function verifyMfaEnrollment(factorId: string, code: string): Promise<void> {
  await challengeAndVerifyFactor(factorId, code);
}

export async function completeMfaLogin(factorId: string, code: string): Promise<AuthSession> {
  await challengeAndVerifyFactor(factorId, code);
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiError('Session expired. Please sign in again.', 'unknown_error');
  return sessionFromSupabase(data.session.access_token, data.session.user.id);
}

export async function unenrollMfaFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new ApiError(error.message, 'unknown_error');
}

/**
 * cancelMfaEnrollment
 * Cleans up an enrolled-but-never-verified factor when the user backs out
 * of setup — Supabase caps unverified TOTP factors per user, so leaving
 * abandoned ones around would eventually block re-enrollment.
 */
export async function cancelMfaEnrollment(factorId: string): Promise<void> {
  await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Certificates — Express, institution-scoped via the caller's own token.
// ---------------------------------------------------------------------------

function mapCertificateInput(input: IssueCertificateInput) {
  return {
    student_name: input.studentName,
    registration_number: input.registrationNumber,
    course_name: input.courseName,
    grade: input.grade ?? null,
    issue_date: input.issueDate,
  };
}

export async function listCertificatesForInstitution(_institutionId: string): Promise<Certificate[]> {
  const { certificates } = await api.get<{ certificates: Certificate[] }>('/certificates');
  return certificates;
}

export interface IssueCertificateInput {
  studentName: string;
  registrationNumber: string;
  courseName: string;
  grade?: string;
  issueDate: string;
  documentUri?: string;
}

/**
 * issueCertificate
 * documentUri (the optional attached photo/scan) isn't sent anywhere yet —
 * IPFS/Thirdweb Storage upload is the next phase of work, so ipfs_uri comes
 * back null from the server until that lands.
 */
export async function issueCertificate(institution: Institution, input: IssueCertificateInput): Promise<Certificate> {
  if (institution.status !== 'approved') {
    throw new ApiError('Only approved institutions can issue certificates.', 'not_approved');
  }
  const { certificate } = await api.post<{ certificate: Certificate }>('/certificates', mapCertificateInput(input));
  return certificate;
}

export interface BulkIssueResult {
  success: Certificate[];
  failed: { row: number; reason: string }[];
}

export async function bulkIssueCertificates(
  institution: Institution,
  rows: IssueCertificateInput[],
): Promise<BulkIssueResult> {
  if (institution.status !== 'approved') {
    throw new ApiError('Only approved institutions can issue certificates.', 'not_approved');
  }

  const success: Certificate[] = [];
  const failed: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.studentName || !row.registrationNumber || !row.courseName || !row.issueDate) {
      failed.push({ row: i + 1, reason: 'Missing required field(s).' });
      continue;
    }
    try {
      const { certificate } = await api.post<{ certificate: Certificate }>('/certificates', mapCertificateInput(row));
      success.push(certificate);
    } catch (e) {
      failed.push({ row: i + 1, reason: e instanceof ApiError ? e.message : 'Unknown error.' });
    }
  }

  return { success, failed };
}

export async function revokeCertificate(certificateId: string, reason: string): Promise<Certificate> {
  const { certificate } = await api.post<{ certificate: Certificate }>(
    `/certificates/${encodeURIComponent(certificateId)}/revoke`,
    { reason },
  );
  return certificate;
}

export async function verifyCertificateById(query: string): Promise<VerificationResponse> {
  return api.get<VerificationResponse>(`/certificates/verify/${encodeURIComponent(query.trim())}`);
}

export interface ListAllCertificatesFilter {
  status?: CertificateStatus;
  query?: string;
}

export async function listAllCertificates(filter?: ListAllCertificatesFilter): Promise<Certificate[]> {
  const { certificates } = await api.get<{ certificates: Certificate[] }>('/admin/certificates', {
    status: filter?.status,
    query: filter?.query,
  });
  return certificates;
}

/**
 * listVerificationEventsForInstitution
 * No institution-scoped verification-events endpoint exists on the server
 * yet, so this still reads the (disconnected, seed-only) mock log — real
 * verification traffic against real certificates won't show up here until
 * that endpoint is built.
 */
export async function listVerificationEventsForInstitution(institutionId: string): Promise<VerificationEvent[]> {
  await delay(300);
  return verificationEvents
    .filter((e) => e.institution_id === institutionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------------------------------------------------------------------
// Admin / Institutions — Express, admin-only.
// ---------------------------------------------------------------------------

export async function listInstitutions(filter?: Institution['status']): Promise<Institution[]> {
  const { institutions } = await api.get<{ institutions: Institution[] }>('/institutions', { status: filter });
  return institutions;
}

export async function approveInstitution(id: string): Promise<Institution> {
  const { institution } = await api.post<{ institution: Institution }>(
    `/institutions/${encodeURIComponent(id)}/approve`,
  );
  return institution;
}

export async function rejectInstitution(id: string, reason: string): Promise<Institution> {
  const { institution } = await api.post<{ institution: Institution }>(
    `/institutions/${encodeURIComponent(id)}/reject`,
    { reason },
  );
  return institution;
}

export async function suspendInstitution(id: string, reason: string): Promise<Institution> {
  const { institution } = await api.post<{ institution: Institution }>(
    `/institutions/${encodeURIComponent(id)}/suspend`,
    { reason },
  );
  return institution;
}

interface ServerAnalytics {
  institutions: { total: number; pending: number; approved: number; rejected: number; suspended: number };
  certificates: { total: number; active: number; revoked: number };
  verificationEvents: { total: number; valid: number; invalid: number; revoked: number; not_found: number };
}

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  const { analytics } = await api.get<{ analytics: ServerAnalytics }>('/admin/analytics');

  return {
    total_institutions: analytics.institutions.total,
    pending_institutions: analytics.institutions.pending,
    approved_institutions: analytics.institutions.approved,
    suspended_institutions: analytics.institutions.suspended,
    total_certificates: analytics.certificates.total,
    active_certificates: analytics.certificates.active,
    revoked_certificates: analytics.certificates.revoked,
    verifications_last_30_days: analytics.verificationEvents.total,
  };
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { auditLogs } = await api.get<{ auditLogs: AuditLogEntry[] }>('/admin/audit-logs', { limit: '100' });
  return auditLogs;
}

// ---------------------------------------------------------------------------
// Account settings
//
// updateProfile/changePassword are real (Supabase Auth + the profiles
// table). Everything else below has no backend counterpart yet — sessions,
// API keys, and multi-staff teams aren't real concepts in the current
// schema, and notifications/support tickets have no table — so they stay
// mock-backed, same as before.
// ---------------------------------------------------------------------------

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export async function updateProfile(profileId: string, input: UpdateProfileInput): Promise<Profile> {
  const current = await fetchProfile(profileId);

  // Changing email re-points auth.users.email (subject to Supabase's email
  // change confirmation flow); profiles.email is kept in sync below so the
  // two never drift once the change is confirmed.
  if (input.email && input.email.toLowerCase() !== current.email.toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email: input.email });
    if (error) throw new ApiError(error.message, 'unknown_error');
  }

  const firstName = input.firstName ?? current.first_name;
  const lastName = input.lastName ?? current.last_name;

  const updates: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim(),
  };
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;
  if (input.email) updates.email = input.email;

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', profileId).select().single();
  if (error || !data) throw new ApiError('Could not update your profile.', 'unknown_error');
  return data as Profile;
}

export async function changePassword(profileId: string, currentPassword: string, newPassword: string): Promise<void> {
  const profile = await fetchProfile(profileId);

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });
  if (reauthError) throw new ApiError('Current password is incorrect.', 'invalid_credentials');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new ApiError(error.message, 'unknown_error');
}

export async function listSessions(profileId: string): Promise<DeviceSession[]> {
  await delay(300);
  return sessionsByProfile[profileId] ?? [];
}

export async function revokeSession(profileId: string, sessionId: string): Promise<DeviceSession[]> {
  await delay(400);
  const current = sessionsByProfile[profileId] ?? [];
  sessionsByProfile[profileId] = current.filter((s) => s.id !== sessionId || s.isCurrent);
  return sessionsByProfile[profileId];
}

export async function revokeAllOtherSessions(profileId: string): Promise<DeviceSession[]> {
  await delay(500);
  const current = sessionsByProfile[profileId] ?? [];
  sessionsByProfile[profileId] = current.filter((s) => s.isCurrent);
  return sessionsByProfile[profileId];
}

export async function listApiKeys(profileId: string): Promise<ApiKey[]> {
  await delay(300);
  return apiKeysByProfile[profileId] ?? [];
}

export async function generateApiKey(profileId: string, name: string): Promise<{ key: ApiKey; rawKey: string }> {
  await delay(600);
  const rawKey = `tsk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const key: ApiKey = {
    id: nextId('key'),
    name,
    maskedKey: `tsk_live_••••••••${rawKey.slice(-4)}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  apiKeysByProfile[profileId] = [key, ...(apiKeysByProfile[profileId] ?? [])];
  return { key, rawKey };
}

export async function revokeApiKey(profileId: string, keyId: string): Promise<void> {
  await delay(400);
  apiKeysByProfile[profileId] = (apiKeysByProfile[profileId] ?? []).filter((k) => k.id !== keyId);
}

/**
 * deactivateAccount
 * Institutions: real soft delete via POST /institutions/deactivate — the
 * row and every certificate it has issued remain in place and verifiable
 * (see supabase/migrations/0004_institution_deactivation.sql). The caller
 * is signed out by the screen right after this resolves.
 *
 * Verifiers/admins: still a no-op. They own no institution/certificates, so
 * there's no cascade-safety reason to hold this back — real deletion via
 * Supabase's Admin API is a reasonable follow-up, just not implemented yet.
 */
export async function deactivateAccount(profileId: string): Promise<void> {
  const profile = await fetchProfile(profileId);
  if (profile.role === 'institution') {
    await api.post('/institutions/deactivate');
  }
}

export interface SupportTicketInput {
  category: string;
  subject: string;
  message: string;
}

export async function submitSupportTicket(
  profile: Pick<Profile, 'id' | 'full_name' | 'email'>,
  input: SupportTicketInput,
): Promise<{ ticketId: string }> {
  await delay(700);
  const ticketId = `TSK-${nextId('ticket').split('_')[1].toUpperCase()}`;
  // No support_tickets table yet, so no real notification is generated for
  // this one — see the Notifications section below for what is real.
  return { ticketId };
}

// ---------------------------------------------------------------------------
// Notifications — real (public.notifications, RLS-scoped to the caller's
// own rows). Currently only institution approve/reject generates one (see
// server/src/services/institutionService.ts); more event types can reuse
// the same table/shape later without any client-side changes here beyond
// what they already are.
// ---------------------------------------------------------------------------

export async function listNotifications(profileId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(error.message, 'unknown_error');
  return (data as AppNotification[]) ?? [];
}

export async function markNotificationRead(profileId: string, id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('profile_id', profileId);
  if (error) throw new ApiError(error.message, 'unknown_error');
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false);
  if (error) throw new ApiError(error.message, 'unknown_error');
}

// ---------------------------------------------------------------------------
// Institution team (multiple staff per institution) — no institution
// membership table yet; local/in-memory only.
// ---------------------------------------------------------------------------

export async function listInstitutionMembers(institutionId: string): Promise<InstitutionMember[]> {
  await delay(300);
  return institutionMembers.filter((m) => m.institution_id === institutionId);
}

export interface InviteMemberInput {
  firstName: string;
  lastName: string;
  email: string;
}

function generateTempPassword(): string {
  return `Temp-${Math.random().toString(36).slice(2, 8)}-9!`;
}

export async function inviteInstitutionMember(
  institutionId: string,
  input: InviteMemberInput,
): Promise<{ member: InstitutionMember; tempPassword: string }> {
  await delay(700);
  if (findUserByEmail(input.email)) {
    throw new ApiError('An account with this email already exists.', 'email_taken');
  }

  const profileId = nextId('profile');
  const tempPassword = generateTempPassword();
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  users.push({
    password: tempPassword,
    profile: {
      id: profileId,
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: fullName,
      email: input.email,
      phone: null,
      role: 'institution',
      avatar_url: null,
      created_at: new Date().toISOString(),
    },
  });

  const member: InstitutionMember = {
    institution_id: institutionId,
    profile_id: profileId,
    full_name: fullName,
    email: input.email,
    role: 'staff',
    invited_at: new Date().toISOString(),
  };
  institutionMembers.push(member);

  // No institution_members table yet, so no real notification for this
  // one either — see the Notifications section for what is real.

  return { member, tempPassword };
}

export async function removeInstitutionMember(institutionId: string, profileId: string): Promise<void> {
  await delay(500);
  const member = institutionMembers.find((m) => m.institution_id === institutionId && m.profile_id === profileId);
  if (!member) throw new ApiError('Member not found.', 'not_found');
  if (member.role === 'owner') throw new ApiError('The institution owner cannot be removed.', 'forbidden');
  const index = institutionMembers.indexOf(member);
  institutionMembers.splice(index, 1);
}
