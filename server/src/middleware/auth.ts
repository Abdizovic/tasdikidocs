import { NextFunction, Request, Response } from "express";
import { ApiError } from "./errorHandler";
import { supabaseAdmin } from "../lib/supabase";
import { AuthenticatedUser, Role } from "../types/domain";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * requireAuth
 * -----------
 * Verifies a bearer token issued by Supabase Auth and attaches
 * `req.user = { id, role, email }`. The role is always read fresh from the
 * `profiles` table via the service-role client — it is never trusted from
 * the token's own claims, since a client cannot be allowed to grant itself
 * a role.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // Test-only convenience shim: simulate an authenticated user via headers so
  // routes can be exercised without a real Supabase session. Disabled outside
  // test/development so it can never be used to spoof identity in production.
  if (process.env.NODE_ENV !== "production") {
    const mockUserId = req.header("x-mock-user-id");
    const mockRole = req.header("x-mock-role") as Role | undefined;
    if (mockUserId && mockRole) {
      req.user = { id: mockUserId, role: mockRole };
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = authHeader.slice("Bearer ".length);

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, email")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return next(ApiError.unauthorized("No profile found for this account"));
  }

  // Defense in depth: a deactivated institution's access token stays valid
  // until it expires, so this is checked on every request, not just at
  // sign-in. See supabase/migrations/0004_institution_deactivation.sql.
  if (profile.role === "institution") {
    const { data: institution } = await supabaseAdmin
      .from("institutions")
      .select("deactivated_at")
      .eq("profile_id", data.user.id)
      .maybeSingle();
    if (institution?.deactivated_at) {
      return next(ApiError.forbidden("This institution account has been deactivated", "INSTITUTION_DEACTIVATED"));
    }
  }

  req.user = { id: data.user.id, role: profile.role as Role, email: profile.email };
  return next();
}

/**
 * requireRole
 * -----------
 * Gate a route to only the given roles. Must run after requireAuth.
 *
 * This is the ONLY mechanism by which role-sensitive actions (e.g.
 * approving/rejecting/suspending an institution) are permitted — a
 * regular client request body can never set its own role or an
 * institution's status; only a caller whose *authenticated* role passes
 * this check can reach those service functions.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires one of roles: ${roles.join(", ")}`));
    }
    return next();
  };
}
