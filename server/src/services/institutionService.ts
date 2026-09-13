import { ApiError } from "../middleware/errorHandler";
import { supabaseAdmin } from "../lib/supabase";
import { Institution, InstitutionStatus } from "../types/domain";
import * as auditLogService from "./auditLogService";
import * as notificationService from "./notificationService";

/**
 * SECURITY NOTE: `status` is deliberately never accepted as client input
 * anywhere in this file. It can only move between states via the
 * approve/reject/suspend functions below, each of which requires an
 * `adminId` — and the routes that call them are gated by
 * `requireRole("admin")` (see src/routes/institutions.routes.ts). There is
 * no code path where a client-supplied `status` field is written through.
 * The `institutions_protect_status` trigger enforces this at the database
 * level too — only the service-role client (used here) may change
 * status/reviewed_by/reviewed_at.
 */

export interface ApplyAsInstitutionInput {
  profile_id: string;
  institution_name: string;
  registration_number: string;
  country: string;
  website?: string | null;
  contact_phone?: string | null;
}

/**
 * applyAsInstitution
 * Public self-service application. Always created with status "pending" —
 * the caller cannot influence the initial status, and there is no
 * parameter here that would let them.
 */
export async function applyAsInstitution(data: ApplyAsInstitutionInput): Promise<Institution> {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("institutions")
    .select("id")
    .ilike("registration_number", data.registration_number)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    throw ApiError.conflict("An institution with this registration number already exists");
  }

  const { data: institution, error } = await supabaseAdmin
    .from("institutions")
    .insert({
      profile_id: data.profile_id,
      institution_name: data.institution_name,
      registration_number: data.registration_number,
      country: data.country,
      website: data.website ?? null,
      contact_phone: data.contact_phone ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await auditLogService.record({
    actorId: data.profile_id,
    action: "institution.applied",
    targetTable: "institutions",
    targetId: institution.id,
    metadata: { institution_name: institution.institution_name },
  });

  return institution as Institution;
}

export interface ListInstitutionsFilter {
  status?: InstitutionStatus;
  country?: string;
}

export async function listInstitutions(filter: ListInstitutionsFilter = {}): Promise<Institution[]> {
  let query = supabaseAdmin.from("institutions").select("*").order("created_at", { ascending: false });

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.country) query = query.ilike("country", filter.country);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as Institution[];
}

export async function getInstitutionById(id: string): Promise<Institution | undefined> {
  const { data, error } = await supabaseAdmin.from("institutions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Institution) ?? undefined;
}

/**
 * getInstitutionByProfileId
 * Resolves the institution row owned by a given authenticated profile
 * (req.user.id). Used by the certificates routes so an institution-role
 * caller can only ever act on the institution their own account owns —
 * they never get to pass an arbitrary institution_id from the client.
 */
export async function getInstitutionByProfileId(profileId: string): Promise<Institution | undefined> {
  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Institution) ?? undefined;
}

async function mustFind(id: string): Promise<Institution> {
  const institution = await getInstitutionById(id);
  if (!institution) {
    throw ApiError.notFound("Institution not found", "INSTITUTION_NOT_FOUND");
  }
  return institution;
}

/**
 * approveInstitution / rejectInstitution / suspendInstitution
 * -------------------------------------------------------------
 * These are the ONLY functions in the codebase that mutate
 * `institution.status`. Each requires an `adminId` and every call site in
 * src/routes/institutions.routes.ts is protected by
 * `requireRole("admin")`, so a regular institution/verifier request can
 * never reach these — even if it sent a `status` field in its body, this
 * layer never reads such a field.
 */
export async function approveInstitution(id: string, adminId: string): Promise<Institution> {
  await mustFind(id);

  const { data: institution, error } = await supabaseAdmin
    .from("institutions")
    .update({
      status: "approved",
      rejection_reason: null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await auditLogService.record({
    actorId: adminId,
    action: "institution.approved",
    targetTable: "institutions",
    targetId: institution.id,
    metadata: {},
  });

  await notificationService.create({
    profileId: institution.profile_id,
    title: "Application approved",
    body: `${institution.institution_name} can now issue certificates.`,
    tone: "success",
  });

  return institution as Institution;
}

export async function rejectInstitution(id: string, adminId: string, reason: string): Promise<Institution> {
  await mustFind(id);

  const { data: institution, error } = await supabaseAdmin
    .from("institutions")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await auditLogService.record({
    actorId: adminId,
    action: "institution.rejected",
    targetTable: "institutions",
    targetId: institution.id,
    metadata: { reason },
  });

  await notificationService.create({
    profileId: institution.profile_id,
    title: "Application not approved",
    body: `${institution.institution_name}'s application was not approved: ${reason}`,
    tone: "danger",
  });

  return institution as Institution;
}

export async function suspendInstitution(id: string, adminId: string, reason: string): Promise<Institution> {
  await mustFind(id);

  const { data: institution, error } = await supabaseAdmin
    .from("institutions")
    .update({
      status: "suspended",
      rejection_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await auditLogService.record({
    actorId: adminId,
    action: "institution.suspended",
    targetTable: "institutions",
    targetId: institution.id,
    metadata: { reason },
  });

  return institution as Institution;
}

/**
 * deactivateOwnInstitution
 * Self-service — the caller can only ever deactivate the institution their
 * own account owns (profileId comes from req.user, never a client-supplied
 * institution id). Soft delete only: the row and every certificate it has
 * ever issued remain in place and fully verifiable, per
 * supabase/migrations/0004_institution_deactivation.sql. Idempotent.
 */
export async function deactivateOwnInstitution(profileId: string): Promise<Institution> {
  const institution = await getInstitutionByProfileId(profileId);
  if (!institution) {
    throw ApiError.notFound("No institution is associated with this account", "NO_INSTITUTION_FOR_USER");
  }

  if (institution.deactivated_at) {
    return institution;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("institutions")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", institution.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await auditLogService.record({
    actorId: profileId,
    action: "institution.deactivated",
    targetTable: "institutions",
    targetId: updated.id,
    metadata: {},
  });

  return updated as Institution;
}

export async function countByStatus(): Promise<Record<InstitutionStatus, number>> {
  const counts: Record<InstitutionStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  };

  const { data, error } = await supabaseAdmin.from("institutions").select("status");
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    counts[row.status as InstitutionStatus] += 1;
  }
  return counts;
}
