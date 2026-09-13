# TasdikiDocs — Security Checklist

This maps every item from the project spec's security checklist to where it
actually lives in the codebase, so nothing on that list is aspirational.

| Concern | Where it lives | Notes |
| --- | --- | --- |
| **Validation** | `server/src/middleware/validate.ts` (zod schemas per route) + Postgres `NOT NULL`/`CHECK`/enum constraints in `supabase/migrations/0001_init.sql` | Validated at both the API boundary and the database boundary — never trust one layer alone. |
| **Rate limiting** | `server/src/middleware/rateLimiter.ts` | A general API limiter plus a much stricter `otpLimiter` on `/auth/forgot-password` and `/auth/verify-otp` to block brute force / OTP spam. |
| **CSP** | `server/src/app.ts` via `helmet({ contentSecurityPolicy: {...} })` | Locked to `default-src 'self'`; tightened further once real asset/CDN origins are known. |
| **Caching** | `server/src/routes/certificates.routes.ts` public verify endpoint sets `Cache-Control: public, max-age=30` | Verification is read-heavy and idempotent — safe to cache briefly; everything else is `no-store`. |
| **SEO** | `app/src/app/verify/[certId].tsx` (public web verification page, Expo Router web output) | A certificate's QR code resolves to a real URL with per-certificate `<Head>` title/description, not just an in-app deep link — makes verification usable with zero app install. |
| **UX** | Shared `app/src/components/ui/` kit — loading, empty, and error states are first-class, not afterthoughts; inline form validation; haptic feedback on scan (`expo-haptics`). | See [docs/mobile-app.md](docs/mobile-app.md). |
| **Monitoring** | `server` `/health` endpoint, `winston` structured logs, `verification_events` table (every verification lookup, feeds admin analytics) | `/health` is what an uptime monitor / load balancer should poll. |
| **DB-level security** | RLS enabled on every table in `public` (`supabase/migrations/0002_rls.sql`); anything with no business being on the REST API lives in the `private` schema (`0006_security_hardening.sql`); `prevent_protected_field_change` trigger blocks client edits to `role`/`institution.status` even if RLS is ever misconfigured | Defense in depth — the non-negotiable "server-set only" rule is enforced at the trigger level, not just via policy. |
| **Auth** | Supabase Auth (email/password) → JWT; `server/src/middleware/auth.ts` (`requireAuth`, `requireRole`) | No signup path exists for admin anywhere in the client; admin is seeded via `supabase/seed_admin.sql` only. |
| **Logs** | `audit_logs` table (every approval/rejection/suspension/revocation, with actor + metadata) + `winston` server logs | Audit trail is queryable by admins (`GET /admin/audit-logs`), not just buried in log files. |
| **Backups** | Documented in `supabase/README.md` | Supabase automatic daily backups + optional PITR add-on; enable PITR before handling real student records. |
| **Pooling** | `server/.env.example` → `DATABASE_POOL_URL` (Supabase's pooled port `6543`, PgBouncer) documented in `supabase/README.md` | The direct connection (port 5432) has a low connection cap and isn't meant for API traffic. |

## Non-negotiable rule (from the spec)

`role` and `institution status` are **never** accepted from client input. This
is enforced three ways simultaneously, deliberately redundant:

1. `handle_new_user()` trigger only ever assigns `verifier` from signup
   metadata — never `admin`, and the institution path never sets `approved`.
2. `prevent_protected_field_change()` trigger rejects any UPDATE to
   `profiles.role` or `institutions.status`/`reviewed_*` unless performed
   with the service role.
3. The only code path that legitimately changes these fields is the
   `approve-institution` edge function (or the equivalent Express
   `institutions.routes.ts` admin routes), both of which require
   `requireRole('admin')` before touching anything.

## Additional controls now in place

- **MFA (TOTP)** via Supabase Auth, available to every role. A verified factor
  forces an AAL2 challenge at sign-in, re-checked on session restore so a
  persisted AAL1 session can't silently grant access
  ([docs/architecture.md](docs/architecture.md#mfa)).
- **Deactivation re-checked per request.** `requireAuth` rejects a
  soft-deactivated institution on every call, not only at sign-in, because its
  access token stays cryptographically valid until expiry.
- **Role read from the database per request**, never from JWT claims, so a
  token minted before a role change carries no stale privilege.
- **Certificates protected against cascade deletion.** Migration `0004`
  changed `institutions.profile_id` and `certificates.institution_id` from
  `ON DELETE CASCADE` to `ON DELETE RESTRICT`, so deleting an account can no
  longer silently destroy issued certificates — it fails loudly instead.
- **Notification content immutable from the client.** The
  `prevent_notification_content_change` trigger allows a client to flip `read`
  and nothing else.
- **Nothing internal is left in the REST-exposed schema.** Migration `0006`
  moved `_migrations` and the three `SECURITY DEFINER` RLS helpers into
  `private`, which PostgREST does not serve. Before that, `anon` could
  `DELETE` the migration history (confirmed against the live database, not
  inferred) and call `/rest/v1/rpc/is_admin`. Rationale, and why revoking
  `EXECUTE` would have broken the app instead, is in
  [supabase/README.md](supabase/README.md#the-private-schema).
- **`search_path` pinned on every function**, so no unqualified name inside a
  trigger resolves against a caller-controlled schema list.

## Known gaps

- **The whole `certificates` table is enumerable by anyone.** The SELECT policy
  is `using (true)` because public verifiability is the product — but that
  grants *listing*, not just lookup: one unauthenticated request returns every
  `student_name`, `registration_number`, `course_name` and `grade` on the
  platform. A paper certificate discloses one student's record to whoever holds
  it; this discloses all of them to anyone. If that is not intended,
  verification has to move behind the Express API (which already holds the
  service role) and the public policy be dropped — that is a deliberate design
  decision, so it has not been changed unilaterally.
- **Leaked-password protection is off and cannot be enabled on this plan.**
  Supabase gates the HaveIBeenPwned check behind Pro (the API returns HTTP 402).
  Until the project is upgraded, `password_min_length` is `6` with no character
  requirements, so "123456" is an acceptable password for an institution
  account that can issue certificates. Raising the minimum and requiring
  character classes is free and available now in Authentication → Policies.
- **Email confirmation is disabled** (`mailer_autoconfirm: true`), so an account
  can be created against an email address the registrant does not control.
  Institution accounts are approval-gated so the blast radius is limited to
  verifier accounts, but it also means the OTP password-reset flow trusts an
  unverified address.
- **Revocation is off-chain only.** `certificateService.revokeCertificate`
  updates Postgres but does not call the contract's `revokeCertificate`, so
  on-chain state still reports a revoked certificate as issued. Anyone
  verifying purely on-chain would get a stale answer.
- **Single platform signer.** All minting uses one wallet, so on-chain data
  alone cannot attribute a certificate to a specific institution; that binding
  lives in Postgres. Rationale and trade-offs in
  [docs/architecture.md](docs/architecture.md#on-chain-model-one-platform-signer).
- **Cleartext HTTP is enabled on Android** (`usesCleartextTraffic`) so the app
  can reach the local dev server over `http://<LAN-IP>:4000`. This must be
  removed and the API served over HTTPS before any production deployment.
- **The `x-mock-user-id` / `x-mock-role` test shim** in `requireAuth` bypasses
  token verification. It is hard-disabled when `NODE_ENV=production`; verify
  that variable is actually set in any deployed environment.
- **Device sessions, API keys, and institution team management are UI-only.**
  They render mock data and enforce nothing — do not present them as
  functioning security controls.
