import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import * as adminService from "../services/adminService";
import * as certificateService from "../services/certificateService";

const router = Router();

const auditLogsQuerySchema = z.object({
  action: z.string().optional(),
  targetTable: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const certificatesQuerySchema = z.object({
  status: z.enum(["active", "revoked"]).optional(),
  query: z.string().optional(),
});

/**
 * GET /api/v1/admin/analytics
 * Admin-only aggregate counts across institutions/certificates/verification
 * activity.
 */
router.get("/analytics", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const analytics = await adminService.getAnalytics();
    res.status(200).json({ analytics });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * Admin-only. Exposes the audit trail of every sensitive mutation made
 * through this API (institution status changes, certificate issue/revoke,
 * password resets).
 */
router.get(
  "/audit-logs",
  requireAuth,
  requireRole("admin"),
  validate(auditLogsQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const filter = req.query as unknown as z.infer<typeof auditLogsQuerySchema>;
      const { items, total } = await adminService.getAuditLogs(filter);
      res.status(200).json({ auditLogs: items, total });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/certificates
 * Admin-only global certificate search, across every institution.
 */
router.get(
  "/certificates",
  requireAuth,
  requireRole("admin"),
  validate(certificatesQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const filter = req.query as unknown as z.infer<typeof certificatesQuerySchema>;
      const certificates = await certificateService.listAllCertificates(filter);
      res.status(200).json({ certificates });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
