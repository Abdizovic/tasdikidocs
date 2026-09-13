import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import * as institutionService from "../services/institutionService";

const router = Router();

const applySchema = z.object({
  institution_name: z.string().min(2),
  registration_number: z.string().min(2),
  country: z.string().min(2),
  website: z.string().url().optional().nullable(),
  contact_phone: z.string().min(5).optional().nullable(),
});

const listQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  country: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const rejectSchema = z.object({
  reason: z.string().min(3, "A rejection reason is required"),
});

const suspendSchema = z.object({
  reason: z.string().min(3, "A suspension reason is required"),
});

/**
 * POST /api/v1/institutions/apply
 * Requires an authenticated Supabase session (the account itself is created
 * client-side via supabase.auth.signUp with role: "institution" metadata).
 * profile_id always comes from the verified token, never the request body,
 * and the record is always created in "pending" status.
 */
router.post("/apply", requireAuth, validate(applySchema), async (req, res, next) => {
  try {
    const institution = await institutionService.applyAsInstitution({
      ...req.body,
      profile_id: req.user!.id,
    });
    res.status(201).json({ institution });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/institutions
 * Admin-only. Lists institutions, optionally filtered by status/country.
 */
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validate(listQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const filter = req.query as unknown as z.infer<typeof listQuerySchema>;
      const institutions = await institutionService.listInstitutions(filter);
      res.status(200).json({ institutions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/institutions/:id/approve
 * Admin-only. This — along with reject/suspend below — is the ONLY way an
 * institution's status can change. The acting admin's id comes from
 * `req.user` (set by requireAuth after verifying the JWT), never from the
 * request body.
 */
router.post(
  "/:id/approve",
  requireAuth,
  requireRole("admin"),
  validate(idParamSchema, "params"),
  async (req, res, next) => {
    try {
      const institution = await institutionService.approveInstitution(req.params.id, req.user!.id);
      res.status(200).json({ institution });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/institutions/:id/reject
 * Admin-only.
 */
router.post(
  "/:id/reject",
  requireAuth,
  requireRole("admin"),
  validate(idParamSchema, "params"),
  validate(rejectSchema, "body"),
  async (req, res, next) => {
    try {
      const institution = await institutionService.rejectInstitution(
        req.params.id,
        req.user!.id,
        req.body.reason
      );
      res.status(200).json({ institution });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/institutions/:id/suspend
 * Admin-only.
 */
router.post(
  "/:id/suspend",
  requireAuth,
  requireRole("admin"),
  validate(idParamSchema, "params"),
  validate(suspendSchema, "body"),
  async (req, res, next) => {
    try {
      const institution = await institutionService.suspendInstitution(
        req.params.id,
        req.user!.id,
        req.body.reason
      );
      res.status(200).json({ institution });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/institutions/deactivate
 * Institution-only self-service. Deactivates the caller's own institution —
 * the id always comes from req.user, never the request body, so a caller
 * can only ever deactivate their own account. Soft delete only: the
 * institution row and every certificate it has issued remain in place and
 * fully verifiable (see supabase/migrations/0004_institution_deactivation.sql).
 */
router.post("/deactivate", requireAuth, requireRole("institution"), async (req, res, next) => {
  try {
    const institution = await institutionService.deactivateOwnInstitution(req.user!.id);
    res.status(200).json({ institution });
  } catch (err) {
    next(err);
  }
});

export default router;
