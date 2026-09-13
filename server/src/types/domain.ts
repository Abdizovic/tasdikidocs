/**
 * Domain types mirroring the Supabase schema being designed in parallel
 * (see supabase/ migrations). Keeping these shapes in sync means the
 * services in src/services/* can be swapped from in-memory mocks to real
 * Supabase-backed implementations without changing the route/controller
 * layer that consumes them.
 */

export type Role = "institution" | "verifier" | "admin";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type InstitutionStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Institution {
  id: string;
  profile_id: string;
  institution_name: string;
  registration_number: string;
  country: string;
  website: string | null;
  contact_phone: string | null;
  wallet_address: string | null;
  status: InstitutionStatus;
  rejection_reason: string | null;
  // Set when the owner self-deactivates. The row (and its certificates) is
  // never deleted — see supabase/migrations/0004_institution_deactivation.sql.
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CertificateStatus = "active" | "revoked";

export interface Certificate {
  id: string;
  institution_id: string;
  // Populated via a join in certificateService — not a real column on the
  // certificates table (kept normalized), but every certificate-returning
  // response includes it since the app displays it directly.
  institution_name?: string;
  student_name: string;
  registration_number: string;
  course_name: string;
  grade: string;
  issue_date: string;
  certificate_hash: string;
  tx_hash: string | null;
  ipfs_uri: string | null;
  status: CertificateStatus;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export type OtpPurpose = "password_reset";

export interface OtpCode {
  id: string;
  user_id: string;
  code_hash: string;
  purpose: OtpPurpose;
  expires_at: string;
  consumed_at: string | null;
  attempt_count: number;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  // Populated via a join in auditLogService — not a real column (kept
  // normalized against profiles), but the app displays it directly.
  actor_name?: string;
  action: string;
  target_table: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type VerificationResult = "valid" | "invalid" | "revoked" | "not_found";

export interface VerificationEvent {
  id: string;
  certificate_id: string | null;
  searched_value: string;
  result: VerificationResult;
  created_at: string;
}

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  tone: NotificationTone;
  link: string | null;
  read: boolean;
  created_at: string;
}

/**
 * Shape attached to `req.user` by requireAuth. Intentionally minimal —
 * mirrors what a decoded Supabase JWT will expose in Phase 2.
 */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  email?: string;
}
