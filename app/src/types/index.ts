// Mirrors supabase/migrations/0001_init.sql exactly, so swapping the mock
// API layer for real Supabase calls later is a type-level no-op.

export type UserRole = 'institution' | 'verifier' | 'admin';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export type InstitutionStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

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
  deactivated_at: string | null;
  created_at: string;
}

export type CertificateStatus = 'active' | 'revoked';

export interface Certificate {
  id: string;
  institution_id: string;
  institution_name: string;
  student_name: string;
  registration_number: string;
  course_name: string;
  grade: string | null;
  issue_date: string;
  certificate_hash: string;
  tx_hash: string | null;
  ipfs_uri: string | null;
  status: CertificateStatus;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export type VerificationResult = 'valid' | 'invalid' | 'revoked' | 'not_found';

export interface VerificationResponse {
  result: VerificationResult;
  certificate: Certificate | null;
}

export interface AuditLogEntry {
  id: string;
  actor_name: string;
  action: string;
  target_table: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AnalyticsSnapshot {
  total_institutions: number;
  pending_institutions: number;
  approved_institutions: number;
  suspended_institutions: number;
  total_certificates: number;
  active_certificates: number;
  revoked_certificates: number;
  verifications_last_30_days: number;
}

export interface AuthSession {
  profile: Profile;
  institution: Institution | null;
  token: string;
}

export interface DeviceSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  tone: NotificationTone;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface VerificationEvent {
  id: string;
  certificate_id: string | null;
  institution_id: string | null;
  searched_value: string;
  result: VerificationResult;
  created_at: string;
}

export type InstitutionMemberRole = 'owner' | 'staff';

export interface InstitutionMember {
  institution_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  role: InstitutionMemberRole;
  invited_at: string;
}
