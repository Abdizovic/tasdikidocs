import { AuditLog } from "../types/domain";
import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";

export interface RecordAuditLogInput {
  actorId: string;
  action: string;
  targetTable: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

// actor_name isn't a column on audit_logs (kept normalized against
// profiles) but the app displays it directly, so every read joins it in.
const SELECT_WITH_ACTOR_NAME = "*, profiles(full_name)";

function flattenActorName(row: any): AuditLog {
  const { profiles, ...rest } = row;
  return { ...rest, actor_name: profiles?.full_name ?? "Unknown" } as AuditLog;
}

export async function record(input: RecordAuditLogInput): Promise<AuditLog> {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      actor_id: input.actorId,
      action: input.action,
      target_table: input.targetTable,
      target_id: input.targetId,
      metadata: input.metadata ?? {},
    })
    .select(SELECT_WITH_ACTOR_NAME)
    .single();

  if (error) {
    logger.error("failed to record audit log", { error: error.message, action: input.action });
    throw new Error(error.message);
  }

  logger.info("audit log recorded", { action: data.action, target: `${data.target_table}:${data.target_id}` });
  return flattenActorName(data);
}

export interface ListAuditLogsFilter {
  action?: string;
  targetTable?: string;
  limit?: number;
  offset?: number;
}

export async function listAll(filter: ListAuditLogsFilter = {}): Promise<{ items: AuditLog[]; total: number }> {
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  let query = supabaseAdmin
    .from("audit_logs")
    .select(SELECT_WITH_ACTOR_NAME, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter.action) query = query.eq("action", filter.action);
  if (filter.targetTable) query = query.eq("target_table", filter.targetTable);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { items: (data ?? []).map(flattenActorName), total: count ?? 0 };
}
