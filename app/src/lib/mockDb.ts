import type {
  ApiKey,
  AuditLogEntry,
  Certificate,
  DeviceSession,
  Institution,
  InstitutionMember,
  Profile,
  UserRole,
  VerificationEvent,
} from '@/types';

// In-memory mock database. Lives for the app process's lifetime only — this
// whole file is the seam that gets deleted once app/lib/mockApi.ts is
// swapped for real Supabase queries. Shapes match supabase/migrations
// exactly on purpose.

interface MockUser {
  profile: Profile;
  password: string;
}

let idCounter = 1000;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

export const users: MockUser[] = [
  {
    password: 'Admin@12345',
    profile: {
      id: 'profile_admin',
      first_name: 'Platform',
      last_name: 'Administrator',
      full_name: 'Platform Administrator',
      email: 'admin@tasdikidocs.com',
      phone: '+254700000001',
      role: 'admin',
      avatar_url: null,
      created_at: '2025-01-05T09:00:00.000Z',
    },
  },
  {
    password: 'Institution@123',
    profile: {
      id: 'profile_inst_approved',
      first_name: 'Grace',
      last_name: 'Mwangi',
      full_name: 'Grace Mwangi',
      email: 'registrar@nairobitech.ac.ke',
      phone: '+254712345678',
      role: 'institution',
      avatar_url: null,
      created_at: '2025-02-10T09:00:00.000Z',
    },
  },
  {
    password: 'Institution@123',
    profile: {
      id: 'profile_inst_pending',
      first_name: 'Samuel',
      last_name: 'Otieno',
      full_name: 'Samuel Otieno',
      email: 'admissions@pendingcollege.ac.ke',
      phone: '+254798765432',
      role: 'institution',
      avatar_url: null,
      created_at: '2026-07-20T09:00:00.000Z',
    },
  },
  {
    password: 'Institution@123',
    profile: {
      id: 'profile_inst_rejected',
      first_name: 'Peter',
      last_name: 'Kamau',
      full_name: 'Peter Kamau',
      email: 'info@unverified-college.example',
      phone: null,
      role: 'institution',
      avatar_url: null,
      created_at: '2026-06-01T09:00:00.000Z',
    },
  },
  {
    password: 'Verifier@123',
    profile: {
      id: 'profile_verifier',
      first_name: 'Jane',
      last_name: 'Doe',
      full_name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '+12025550101',
      role: 'verifier',
      avatar_url: null,
      created_at: '2026-05-15T09:00:00.000Z',
    },
  },
];

export const institutions: Institution[] = [
  {
    id: 'inst_nairobitech',
    profile_id: 'profile_inst_approved',
    institution_name: 'Nairobi Institute of Technology',
    registration_number: 'REG-KE-004821',
    country: 'Kenya',
    website: 'https://nairobitech.ac.ke',
    contact_phone: '+254712345678',
    wallet_address: '0x8f3aE8f5D0a6B2C1e4F5A6B7C8D9E0F1A2B3C4D5',
    status: 'approved',
    rejection_reason: null,
    deactivated_at: null,
    created_at: '2025-02-10T09:05:00.000Z',
  },
  {
    id: 'inst_pendingcollege',
    profile_id: 'profile_inst_pending',
    institution_name: 'Pending College of Business',
    registration_number: 'REG-KE-009911',
    country: 'Kenya',
    website: 'https://pendingcollege.ac.ke',
    contact_phone: '+254798765432',
    wallet_address: null,
    status: 'pending',
    rejection_reason: null,
    deactivated_at: null,
    created_at: '2026-07-20T09:05:00.000Z',
  },
  {
    id: 'inst_unverified',
    profile_id: 'profile_inst_rejected',
    institution_name: 'Unverified College',
    registration_number: 'REG-KE-000112',
    country: 'Kenya',
    website: null,
    contact_phone: null,
    wallet_address: null,
    status: 'rejected',
    rejection_reason: 'Registration number could not be verified with the Ministry of Education registry.',
    deactivated_at: null,
    created_at: '2026-06-01T09:05:00.000Z',
  },
];

export const certificates: Certificate[] = [
  {
    id: 'cert_001',
    institution_id: 'inst_nairobitech',
    institution_name: 'Nairobi Institute of Technology',
    student_name: 'Brian Kiprotich',
    registration_number: 'NIT/CS/2021/0456',
    course_name: 'BSc. Computer Science',
    grade: 'First Class Honours',
    issue_date: '2025-11-20',
    certificate_hash: 'a3f5e9c2d1b8476f0e2c9a1d5b6f8e7c3a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e',
    tx_hash: '0x9c1f2e3d4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e',
    ipfs_uri: 'ipfs://bafybeigdyrztz5p5t2wu4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    status: 'active',
    revoked_at: null,
    revoked_reason: null,
    created_at: '2025-11-20T10:00:00.000Z',
  },
  {
    id: 'cert_002',
    institution_id: 'inst_nairobitech',
    institution_name: 'Nairobi Institute of Technology',
    student_name: 'Amina Yusuf',
    registration_number: 'NIT/BA/2020/0219',
    course_name: 'BA. Business Administration',
    grade: 'Second Class Upper',
    issue_date: '2024-12-15',
    certificate_hash: 'b4c6d8e0f2a1937b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2',
    tx_hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
    ipfs_uri: 'ipfs://bafybeih5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    status: 'active',
    revoked_at: null,
    revoked_reason: null,
    created_at: '2024-12-15T10:00:00.000Z',
  },
  {
    id: 'cert_003',
    institution_id: 'inst_nairobitech',
    institution_name: 'Nairobi Institute of Technology',
    student_name: 'Collins Mutua',
    registration_number: 'NIT/EE/2019/0087',
    course_name: 'BEng. Electrical Engineering',
    grade: 'Second Class Lower',
    issue_date: '2023-07-10',
    certificate_hash: 'c5d7e9f1a3b2048c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3',
    tx_hash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    ipfs_uri: 'ipfs://bafybeic7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
    status: 'revoked',
    revoked_at: '2026-03-02T08:30:00.000Z',
    revoked_reason: 'Issued in error — duplicate record superseded by NIT/EE/2019/0088.',
    created_at: '2023-07-10T10:00:00.000Z',
  },
];

export const auditLogs: AuditLogEntry[] = [
  {
    id: 'audit_001',
    actor_name: 'Platform Administrator',
    action: 'institution_approve',
    target_table: 'institutions',
    target_id: 'inst_nairobitech',
    metadata: {},
    created_at: '2025-02-11T09:00:00.000Z',
  },
  {
    id: 'audit_002',
    actor_name: 'Platform Administrator',
    action: 'institution_reject',
    target_table: 'institutions',
    target_id: 'inst_unverified',
    metadata: { reason: 'Registration number could not be verified.' },
    created_at: '2026-06-02T09:00:00.000Z',
  },
  {
    id: 'audit_003',
    actor_name: 'Grace Mwangi',
    action: 'certificate_revoke',
    target_table: 'certificates',
    target_id: 'cert_003',
    metadata: { reason: 'Duplicate record.' },
    created_at: '2026-03-02T08:30:00.000Z',
  },
];

// Per-profile mock device sessions and API keys, keyed by profile id.
// Purely illustrative — there is no real session/token infrastructure until
// Supabase Auth is wired up; this exists so the Account Settings screens
// have something real to render and mutate.
export const sessionsByProfile: Record<string, DeviceSession[]> = {
  profile_admin: [
    { id: 'sess_1', device: 'Chrome on Windows', location: 'Nairobi, Kenya', ipAddress: '102.68.xxx.12', lastActiveAt: new Date().toISOString(), isCurrent: true },
    { id: 'sess_2', device: 'Expo Go on iPhone 15', location: 'Nairobi, Kenya', ipAddress: '102.68.xxx.44', lastActiveAt: '2026-07-28T14:20:00.000Z', isCurrent: false },
  ],
  profile_inst_approved: [
    { id: 'sess_3', device: 'Chrome on Windows', location: 'Nairobi, Kenya', ipAddress: '105.163.xxx.9', lastActiveAt: new Date().toISOString(), isCurrent: true },
  ],
  profile_verifier: [
    { id: 'sess_4', device: 'Safari on macOS', location: 'New York, USA', ipAddress: '73.12.xxx.201', lastActiveAt: new Date().toISOString(), isCurrent: true },
    { id: 'sess_5', device: 'Expo Go on Pixel 8', location: 'New York, USA', ipAddress: '73.12.xxx.55', lastActiveAt: '2026-07-30T08:05:00.000Z', isCurrent: false },
  ],
};

export const apiKeysByProfile: Record<string, ApiKey[]> = {
  profile_admin: [
    { id: 'key_1', name: 'Analytics dashboard', maskedKey: 'tsk_live_••••••••a1F2', createdAt: '2026-04-01T10:00:00.000Z', lastUsedAt: '2026-07-30T09:00:00.000Z' },
  ],
};

// Institution access is resolved through this membership table, not
// institutions.profile_id directly — that field stays as "who originally
// applied," while this table is the actual source of truth for who can log
// in and act on behalf of an institution (owner or invited staff).
export const institutionMembers: InstitutionMember[] = [
  { institution_id: 'inst_nairobitech', profile_id: 'profile_inst_approved', full_name: 'Grace Mwangi', email: 'registrar@nairobitech.ac.ke', role: 'owner', invited_at: '2025-02-10T09:05:00.000Z' },
  { institution_id: 'inst_pendingcollege', profile_id: 'profile_inst_pending', full_name: 'Samuel Otieno', email: 'admissions@pendingcollege.ac.ke', role: 'owner', invited_at: '2026-07-20T09:05:00.000Z' },
  { institution_id: 'inst_unverified', profile_id: 'profile_inst_rejected', full_name: 'Peter Kamau', email: 'info@unverified-college.example', role: 'owner', invited_at: '2026-06-01T09:05:00.000Z' },
];

export const verificationEvents: VerificationEvent[] = [
  { id: 'vevt_1', certificate_id: 'cert_001', institution_id: 'inst_nairobitech', searched_value: 'NIT/CS/2021/0456', result: 'valid', created_at: '2026-07-25T10:00:00.000Z' },
  { id: 'vevt_2', certificate_id: 'cert_002', institution_id: 'inst_nairobitech', searched_value: 'NIT/BA/2020/0219', result: 'valid', created_at: '2026-07-27T15:30:00.000Z' },
  { id: 'vevt_3', certificate_id: 'cert_003', institution_id: 'inst_nairobitech', searched_value: 'NIT/EE/2019/0087', result: 'revoked', created_at: '2026-07-29T08:15:00.000Z' },
];

export function findUserByEmail(email: string): MockUser | undefined {
  return users.find((u) => u.profile.email.toLowerCase() === email.trim().toLowerCase());
}

export function findInstitutionByProfileId(profileId: string): Institution | undefined {
  const membership = institutionMembers.find((m) => m.profile_id === profileId);
  if (!membership) return undefined;
  return institutions.find((i) => i.id === membership.institution_id);
}

export function roleHomePath(role: UserRole): string {
  if (role === 'institution') return '/(institution)/dashboard';
  if (role === 'admin') return '/(admin)/dashboard';
  return '/(verifier)/home';
}
