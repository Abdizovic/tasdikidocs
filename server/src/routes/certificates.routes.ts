import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import * as certificateService from "../services/certificateService";
import * as institutionService from "../services/institutionService";

const router = Router();

const issueSchema = z.object({
  student_name: z.string().min(2),
  registration_number: z.string().min(2),
  course_name: z.string().min(2),
  grade: z.string().optional().nullable(),
  issue_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "issue_date must be a valid date"),
});

const revokeSchema = z.object({
  reason: z.string().min(3, "A revocation reason is required"),
});

const idParamSchema = z.object({ id: z.string().min(1) });
const lookupParamSchema = z.object({ idOrRegNumber: z.string().min(1) });

const listQuerySchema = z.object({
  status: z.enum(["active", "revoked"]).optional(),
});

/**
 * Resolves the institution owned by the currently authenticated user.
 * Institution-role callers can only ever operate on their own
 * institution's certificates — the institution id is never taken from the
 * request body/params, only derived server-side from req.user.
 */
async function resolveOwnInstitutionId(profileId: string): Promise<string> {
  const institution = await institutionService.getInstitutionByProfileId(profileId);
  if (!institution) {
    throw ApiError.forbidden("No institution is associated with this account", "NO_INSTITUTION_FOR_USER");
  }
  return institution.id;
}

/**
 * POST /api/v1/certificates
 * Institution-only. Issues a new certificate on behalf of the caller's
 * own institution.
 */
router.post(
  "/",
  requireAuth,
  requireRole("institution"),
  validate(issueSchema),
  async (req, res, next) => {
    try {
      const institutionId = await resolveOwnInstitutionId(req.user!.id);
      const certificate = await certificateService.issueCertificate(institutionId, req.body);
      res.status(201).json({ certificate });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/certificates/:id/revoke
 * Institution-only. Can only revoke certificates issued by the caller's
 * own institution (enforced again inside certificateService as
 * defense-in-depth).
 */
router.post(
  "/:id/revoke",
  requireAuth,
  requireRole("institution"),
  validate(idParamSchema, "params"),
  validate(revokeSchema, "body"),
  async (req, res, next) => {
    try {
      const institutionId = await resolveOwnInstitutionId(req.user!.id);
      const certificate = await certificateService.revokeCertificate(
        req.params.id,
        institutionId,
        req.body.reason
      );
      res.status(200).json({ certificate });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/certificates/verify/:idOrRegNumber
 * PUBLIC. This is the core "scan a QR code / paste a cert id" verification
 * endpoint, so it is intentionally unauthenticated and cacheable for a
 * short window since it's read-heavy.
 */
router.get(
  "/verify/:idOrRegNumber",
  validate(lookupParamSchema, "params"),
  async (req, res, next) => {
    try {
      const { result, certificate } = await certificateService.verifyCertificateById(req.params.idOrRegNumber);
      res.set("Cache-Control", "public, max-age=30");
      res.status(200).json({ result, certificate });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/certificates
 * Institution-only. Lists certificates issued by the caller's own
 * institution.
 */
router.get(
  "/",
  requireAuth,
  requireRole("institution"),
  validate(listQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const institutionId = await resolveOwnInstitutionId(req.user!.id);
      const filter = req.query as unknown as z.infer<typeof listQuerySchema>;
      const certificates = await certificateService.listCertificatesByInstitution(institutionId, filter);
      res.status(200).json({ certificates });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
