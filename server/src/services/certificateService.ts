import crypto from "crypto";
import { ApiError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";
import { mintCertificateOnChain, uploadCertificateMetadata } from "../lib/contract";
import { Certificate, CertificateStatus, VerificationEvent, VerificationResult } from "../types/domain";
import * as auditLogService from "./auditLogService";
import * as institutionService from "./institutionService";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// institution_name isn't a column on certificates (kept normalized) but the
// app displays it directly, so every certificate-returning query joins it in.
const SELECT_WITH_INSTITUTION = "*, institutions(institution_name)";

function flattenInstitutionName(row: any): Certificate {
  const { institutions, ...rest } = row;
  return { ...rest, institution_name: institutions?.institution_name } as Certificate;
}

export interface IssueCertificateInput {
  student_name: string;
  registration_number: string;
  course_name: string;
  grade?: string | null;
  issue_date: string;
}

/**
 * issueCertificate
 * Only reachable via the institution-only route
 * (POST /api/v1/certificates, requireRole("institution")). Refuses to
 * issue on behalf of an institution that isn't currently "approved" —
 * pending/rejected/suspended institutions cannot mint certificates.
 */
export async function issueCertificate(institutionId: string, data: IssueCertificateInput): Promise<Certificate> {
  const institution = await institutionService.getInstitutionById(institutionId);
  if (!institution) {
    throw ApiError.notFound("Institution not found", "INSTITUTION_NOT_FOUND");
  }
  if (institution.status !== "approved") {
    throw ApiError.forbidden(
      `Institution status is "${institution.status}"; only approved institutions may issue certificates`,
      "INSTITUTION_NOT_APPROVED",
    );
  }
  if (institution.deactivated_at) {
    throw ApiError.forbidden("This institution account has been deactivated", "INSTITUTION_DEACTIVATED");
  }

  const payload = `${data.registration_number}|${data.student_name}|${data.course_name}|${data.issue_date}`;
  const certificateHash = crypto.createHash("sha256").update(payload).digest("hex");

  const { data: certificate, error } = await supabaseAdmin
    .from("certificates")
    .insert({
      institution_id: institutionId,
      student_name: data.student_name,
      registration_number: data.registration_number,
      course_name: data.course_name,
      grade: data.grade ?? null,
      issue_date: data.issue_date,
      certificate_hash: certificateHash,
      tx_hash: null,
      ipfs_uri: null,
      status: "active",
    })
    .select(SELECT_WITH_INSTITUTION)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw ApiError.conflict("A certificate with this exact record already exists", "CERTIFICATE_DUPLICATE");
    }
    throw new Error(error.message);
  }

  let ipfsUri: string;
  let txHash: string;
  try {
    ipfsUri = await uploadCertificateMetadata({
      certificate_id: certificate.id,
      institution_name: institution.institution_name,
      student_name: data.student_name,
      registration_number: data.registration_number,
      course_name: data.course_name,
      grade: data.grade ?? null,
      issue_date: data.issue_date,
      certificate_hash: certificateHash,
    });
    ({ txHash } = await mintCertificateOnChain(certificateHash, ipfsUri));
  } catch (mintError) {
    // A certificate that can't be minted on-chain isn't "issued" — roll back
    // rather than leave a row that looks issued but has no on-chain record.
    await supabaseAdmin.from("certificates").delete().eq("id", certificate.id);
    logger.error("failed to mint certificate on-chain", {
      error: (mintError as Error).message,
      certificateId: certificate.id,
    });
    throw new ApiError(502, "Failed to mint certificate on-chain. Please try again.", "MINT_FAILED");
  }

  const { data: minted, error: updateError } = await supabaseAdmin
    .from("certificates")
    .update({ tx_hash: txHash, ipfs_uri: ipfsUri })
    .eq("id", certificate.id)
    .select(SELECT_WITH_INSTITUTION)
    .single();
  if (updateError) throw new Error(updateError.message);

  await auditLogService.record({
    actorId: institution.profile_id,
    action: "certificate.issued",
    targetTable: "certificates",
    targetId: minted.id,
    metadata: { registration_number: minted.registration_number, tx_hash: txHash },
  });

  logger.info(`Certificate issued: ${minted.id} for ${minted.student_name} (tx ${txHash})`);

  return flattenInstitutionName(minted);
}

async function mustFind(id: string): Promise<Certificate> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(SELECT_WITH_INSTITUTION)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw ApiError.notFound("Certificate not found", "CERTIFICATE_NOT_FOUND");
  }
  return flattenInstitutionName(data);
}

/**
 * revokeCertificate
 * Institution-only, and only the issuing institution may revoke its own
 * certificate (enforced here, not just at the route layer).
 */
export async function revokeCertificate(id: string, institutionId: string, reason: string): Promise<Certificate> {
  const certificate = await mustFind(id);

  if (certificate.institution_id !== institutionId) {
    throw ApiError.forbidden(
      "You may only revoke certificates issued by your own institution",
      "NOT_CERTIFICATE_OWNER",
    );
  }

  const institution = await institutionService.getInstitutionById(institutionId);
  if (!institution) {
    throw ApiError.notFound("Institution not found", "INSTITUTION_NOT_FOUND");
  }

  if (certificate.status === "revoked") {
    throw ApiError.conflict("Certificate is already revoked", "ALREADY_REVOKED");
  }

  const { data: updated, error } = await supabaseAdmin
    .from("certificates")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq("id", id)
    .select(SELECT_WITH_INSTITUTION)
    .single();

  if (error) throw new Error(error.message);

  await auditLogService.record({
    actorId: institution.profile_id,
    action: "certificate.revoked",
    targetTable: "certificates",
    targetId: updated.id,
    metadata: { reason },
  });

  return flattenInstitutionName(updated);
}

export interface ListCertificatesFilter {
  status?: CertificateStatus;
}

export async function listCertificatesByInstitution(
  institutionId: string,
  filter: ListCertificatesFilter = {},
): Promise<Certificate[]> {
  let query = supabaseAdmin
    .from("certificates")
    .select(SELECT_WITH_INSTITUTION)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (filter.status) query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(flattenInstitutionName);
}

export interface ListAllCertificatesFilter {
  status?: CertificateStatus;
  query?: string;
}

/**
 * listAllCertificates
 * Admin-only global certificate search, across every institution.
 */
export async function listAllCertificates(filter: ListAllCertificatesFilter = {}): Promise<Certificate[]> {
  let query = supabaseAdmin
    .from("certificates")
    .select(SELECT_WITH_INSTITUTION)
    .order("created_at", { ascending: false });

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.query) {
    const q = filter.query.trim();
    query = query.or(`student_name.ilike.%${q}%,registration_number.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map(flattenInstitutionName);

  // institution_name isn't filterable via the certificates table itself
  // (it lives on the joined row), so apply that part of the search here.
  if (filter.query) {
    const q = filter.query.trim().toLowerCase();
    const alreadyMatched = new Set(rows.map((r) => r.id));
    const { data: byInstitution, error: instError } = await supabaseAdmin
      .from("certificates")
      .select(SELECT_WITH_INSTITUTION)
      .ilike("institutions.institution_name", `%${q}%`);
    if (!instError) {
      for (const row of (byInstitution ?? []).map(flattenInstitutionName)) {
        if (!alreadyMatched.has(row.id) && (!filter.status || row.status === filter.status)) {
          rows.push(row);
        }
      }
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }

  return rows;
}

export interface VerifyCertificateResult {
  result: VerificationResult;
  certificate: Certificate | null;
}

/**
 * verifyCertificateById
 * Public lookup by certificate id OR student registration number.
 * Always logs a `verification_events` row, regardless of outcome, so
 * verification traffic (including failed lookups) is auditable.
 */
export async function verifyCertificateById(idOrRegNumber: string): Promise<VerifyCertificateResult> {
  let query = supabaseAdmin.from("certificates").select(SELECT_WITH_INSTITUTION);

  // `id` is a uuid column — comparing it against a non-uuid string throws a
  // Postgres error rather than just "no match", so only include that branch
  // when the input is actually shaped like a uuid.
  if (UUID_RE.test(idOrRegNumber)) {
    query = query.or(`id.eq.${idOrRegNumber},registration_number.ilike.${idOrRegNumber}`);
  } else {
    query = query.ilike("registration_number", idOrRegNumber);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);

  const certificate = data ? flattenInstitutionName(data) : null;

  let result: VerificationResult;
  if (!certificate) {
    result = "not_found";
  } else if (certificate.status === "revoked") {
    result = "revoked";
  } else {
    result = "valid";
  }

  const { error: eventError } = await supabaseAdmin.from("verification_events").insert({
    certificate_id: certificate?.id ?? null,
    searched_value: idOrRegNumber,
    result,
  });
  if (eventError) {
    logger.error("failed to record verification event", { error: eventError.message });
  }

  return { result, certificate };
}

export async function listVerificationEvents(since?: string): Promise<VerificationEvent[]> {
  let query = supabaseAdmin.from("verification_events").select("*").order("created_at", { ascending: false });
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as VerificationEvent[];
}

export async function countByStatus(): Promise<Record<CertificateStatus, number>> {
  const counts: Record<CertificateStatus, number> = { active: 0, revoked: 0 };

  const { data, error } = await supabaseAdmin.from("certificates").select("status");
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    counts[row.status as CertificateStatus] += 1;
  }
  return counts;
}

export async function countVerificationEventsByResult(since?: string): Promise<Record<VerificationResult, number>> {
  const counts: Record<VerificationResult, number> = {
    valid: 0,
    invalid: 0,
    revoked: 0,
    not_found: 0,
  };

  let query = supabaseAdmin.from("verification_events").select("result");
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    counts[row.result as VerificationResult] += 1;
  }
  return counts;
}
