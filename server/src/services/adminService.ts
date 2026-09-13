import * as institutionService from "./institutionService";
import * as certificateService from "./certificateService";
import * as auditLogService from "./auditLogService";
import { AuditLog } from "../types/domain";

/**
 * Admin-facing aggregate reads. These compose the other mock services
 * rather than owning their own data store, so once institutionService /
 * certificateService are backed by real Supabase queries this file needs
 * no changes beyond perhaps replacing per-table counts with SQL
 * aggregates for performance.
 */

export interface AnalyticsSummary {
  institutions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
  certificates: {
    total: number;
    active: number;
    revoked: number;
  };
  verificationEvents: {
    total: number;
    valid: number;
    invalid: number;
    revoked: number;
    not_found: number;
  };
  generatedAt: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const [institutionCounts, certificateCounts, verificationCounts, verificationEvents] = await Promise.all([
    institutionService.countByStatus(),
    certificateService.countByStatus(),
    certificateService.countVerificationEventsByResult(since),
    certificateService.listVerificationEvents(since),
  ]);

  const institutionsTotal =
    institutionCounts.pending + institutionCounts.approved + institutionCounts.rejected + institutionCounts.suspended;
  const certificatesTotal = certificateCounts.active + certificateCounts.revoked;

  return {
    institutions: {
      total: institutionsTotal,
      pending: institutionCounts.pending,
      approved: institutionCounts.approved,
      rejected: institutionCounts.rejected,
      suspended: institutionCounts.suspended,
    },
    certificates: {
      total: certificatesTotal,
      active: certificateCounts.active,
      revoked: certificateCounts.revoked,
    },
    verificationEvents: {
      total: verificationEvents.length,
      valid: verificationCounts.valid,
      invalid: verificationCounts.invalid,
      revoked: verificationCounts.revoked,
      not_found: verificationCounts.not_found,
    },
    generatedAt: new Date().toISOString(),
  };
}

export interface ListAuditLogsInput {
  action?: string;
  targetTable?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filter: ListAuditLogsInput = {}): Promise<{ items: AuditLog[]; total: number }> {
  return auditLogService.listAll(filter);
}
