# API Reference

Base URL: `http://<host>:<PORT>/api/v1` (default `PORT=4000`).

All request and response bodies are JSON. Request bodies are validated with
Zod; a validation failure returns `400` with code `VALIDATION_ERROR`.

## Authentication

Send the Supabase access token as a bearer token:

```http
Authorization: Bearer <supabase_access_token>
```

`requireAuth` verifies the token with Supabase, then loads the caller's role
from `profiles` — the role in the token itself is never trusted. For
institution-role callers it additionally rejects the request if the
institution is deactivated.

> **Development-only shim.** When `NODE_ENV !== "production"`, sending
> `x-mock-user-id` and `x-mock-role` headers bypasses token verification and
> sets `req.user` directly. This exists so tests can exercise routes without
> a live session. It is hard-disabled in production.

## Error format

Every error — including 404s and rate limits — uses this shape:

```json
{ "error": { "message": "Human-readable message", "code": "MACHINE_CODE" } }
```

| Status | Typical codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `BAD_REQUEST`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_LOCKED` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN`, `INSTITUTION_NOT_APPROVED`, `INSTITUTION_DEACTIVATED`, `NO_INSTITUTION_FOR_USER`, `NOT_CERTIFICATE_OWNER` |
| 404 | `NOT_FOUND`, `ROUTE_NOT_FOUND`, `INSTITUTION_NOT_FOUND`, `CERTIFICATE_NOT_FOUND` |
| 409 | `CONFLICT`, `CERTIFICATE_DUPLICATE`, `ALREADY_REVOKED` |
| 429 | `RATE_LIMITED`, `OTP_RATE_LIMITED` |
| 502 | `MINT_FAILED` |
| 500 | `INTERNAL_ERROR` |

Stack traces and raw unexpected error messages are never returned when
`NODE_ENV=production`.

---

## Health

### `GET /health`

Public. Note this is **not** under `/api/v1`.

```json
{ "status": "ok", "uptime": 901.11, "timestamp": "2026-08-03T04:51:39.335Z" }
```

---

## Auth

All three endpoints are public and share the strict OTP rate limiter
(5 requests / 15 minutes / IP).

### `POST /api/v1/auth/forgot-password`

Generates a 6-digit code, stores only its bcrypt hash, and emails it via
Gmail SMTP. Codes expire after 10 minutes.

```jsonc
// request
{ "email": "registrar@university.ac.ke" }

// 200 — identical whether or not the account exists (anti-enumeration)
{ "message": "If an account exists for that email, a verification code has been sent." }
```

### `POST /api/v1/auth/verify-otp`

Checks a code without consuming it. Increments `attempt_count`; after 5
failed attempts the code is locked (`OTP_LOCKED`).

```jsonc
// request
{ "email": "registrar@university.ac.ke", "code": "615221" }

// 200
{ "valid": true }
```

### `POST /api/v1/auth/reset-password`

Re-validates the code, updates the Supabase Auth password, and consumes the
code so it cannot be reused. `newPassword` must be at least 8 characters.

```jsonc
// request
{ "email": "registrar@university.ac.ke", "code": "615221", "newPassword": "..." }

// 200
{ "message": "..." }
```

---

## Institutions

### `POST /api/v1/institutions/apply`

**Auth required** (any role). Creates the institution record for the
authenticated account. `profile_id` always comes from the verified token,
never the body, and status is always forced to `pending`.

```jsonc
// request
{
  "institution_name": "Umma University",
  "registration_number": "REG-KE-3232",
  "country": "Kenya",
  "website": "https://umma.ac.ke/",      // optional, must be a valid URL
  "contact_phone": "+254700000000"        // optional, min 5 chars
}

// 201
{ "institution": { /* Institution */ } }
```

`409 CONFLICT` if `registration_number` is already taken (case-insensitive).

### `GET /api/v1/institutions`

**Admin only.** Lists all institutions, newest first.

| Query param | Values |
| --- | --- |
| `status` | `pending` · `approved` · `rejected` · `suspended` |
| `country` | case-insensitive match |

```jsonc
// 200
{ "institutions": [ /* Institution[] */ ] }
```

### `POST /api/v1/institutions/:id/approve`

**Admin only.** Sets status to `approved`, clears any rejection reason,
records `reviewed_by`/`reviewed_at`, writes an audit-log entry, and creates
a success notification for the institution owner.

```jsonc
// 200
{ "institution": { /* Institution */ } }
```

### `POST /api/v1/institutions/:id/reject`

**Admin only.** Requires a reason (min 3 chars), which is stored on the row
and included in the notification sent to the owner.

```jsonc
// request
{ "reason": "Registration number could not be verified." }

// 200
{ "institution": { /* Institution */ } }
```

### `POST /api/v1/institutions/:id/suspend`

**Admin only.** Same shape as reject. Suspension blocks new issuance;
previously issued certificates remain valid.

### `POST /api/v1/institutions/deactivate`

**Institution only.** Self-service soft delete of the caller's *own*
institution — the target is always derived from `req.user`, never from the
request, so one account can never deactivate another. Idempotent.

Nothing is deleted: the row and all its certificates remain, and those
certificates stay publicly verifiable. The account can no longer sign in or
issue.

```jsonc
// 200
{ "institution": { /* Institution, with deactivated_at set */ } }
```

---

## Certificates

### `POST /api/v1/certificates`

**Institution only.** Issues a certificate for the caller's own
institution — the institution id is resolved server-side from `req.user` and
is never accepted from the client.

Performs the full issuance pipeline: hash → insert → IPFS upload → on-chain
mint → persist `tx_hash`/`ipfs_uri`. Slow by nature (a blockchain round
trip); expect several seconds.

```jsonc
// request
{
  "student_name": "Jane Doe",
  "registration_number": "UU/CS/2021/0042",
  "course_name": "BSc Computer Science",
  "grade": "First Class",        // optional
  "issue_date": "2026-07-15"      // any Date.parse-able string
}

// 201
{ "certificate": { /* Certificate, incl. tx_hash + ipfs_uri */ } }
```

| Failure | Meaning |
| --- | --- |
| `403 INSTITUTION_NOT_APPROVED` | Institution is pending, rejected, or suspended |
| `403 INSTITUTION_DEACTIVATED` | Owner has deactivated the account |
| `409 CERTIFICATE_DUPLICATE` | An identical certificate hash already exists |
| `502 MINT_FAILED` | IPFS upload or on-chain mint failed; the row was rolled back and nothing was issued |

### `POST /api/v1/certificates/:id/revoke`

**Institution only**, and only for certificates issued by the caller's own
institution — re-checked in the service layer, not just at the route.

```jsonc
// request
{ "reason": "Issued in error." }   // min 3 chars

// 200
{ "certificate": { /* Certificate, status: "revoked" */ } }
```

`409 ALREADY_REVOKED` if it has already been revoked.

> Revocation currently updates Postgres only; it does not call the
> contract's `revokeCertificate`. On-chain state still shows the
> certificate as issued. See [known gaps](#known-gaps).

### `GET /api/v1/certificates/verify/:idOrRegNumber`

**Public — no authentication.** This is the QR-scan / paste-an-ID endpoint.
Accepts either a certificate UUID or a student registration number.

Every call — including misses — writes a `verification_events` row.
Responses carry `Cache-Control: public, max-age=30`.

```jsonc
// 200 — always 200, including "not_found"; check `result`
{
  "result": "valid",              // "valid" | "revoked" | "not_found"
  "certificate": { /* Certificate, or null when not_found */ }
}
```

### `GET /api/v1/certificates`

**Institution only.** Lists the caller's own certificates, newest first.

| Query param | Values |
| --- | --- |
| `status` | `active` · `revoked` |

```jsonc
// 200
{ "certificates": [ /* Certificate[] */ ] }
```

---

## Admin

### `GET /api/v1/admin/analytics`

**Admin only.** Verification counts cover a rolling 30-day window;
institution and certificate counts are all-time.

```jsonc
// 200
{
  "analytics": {
    "institutions":      { "total": 2, "pending": 0, "approved": 2, "rejected": 0, "suspended": 0 },
    "certificates":      { "total": 0, "active": 0, "revoked": 0 },
    "verificationEvents": { "total": 14, "valid": 9, "invalid": 0, "revoked": 0, "not_found": 5 },
    "generatedAt": "2026-08-03T04:51:39.335Z"
  }
}
```

### `GET /api/v1/admin/audit-logs`

**Admin only.** The trail of every privileged mutation. `actor_name` is
joined in from `profiles`.

| Query param | Notes |
| --- | --- |
| `action` | e.g. `institution.approved`, `certificate.issued` |
| `targetTable` | e.g. `institutions`, `certificates` |
| `limit` | positive integer, max 200 |
| `offset` | ≥ 0 |

```jsonc
// 200
{ "auditLogs": [ /* AuditLog[] */ ], "total": 42 }
```

### `GET /api/v1/admin/certificates`

**Admin only.** Global search across every institution.

| Query param | Notes |
| --- | --- |
| `status` | `active` · `revoked` |
| `query` | matches student name, registration number, or institution name |

```jsonc
// 200
{ "certificates": [ /* Certificate[] */ ] }
```

---

## Response objects

Field types mirror `server/src/types/domain.ts`.

### Institution

```ts
{
  id: string;                 // uuid
  profile_id: string;         // uuid → profiles.id
  institution_name: string;
  registration_number: string;
  country: string;
  website: string | null;
  contact_phone: string | null;
  wallet_address: string | null;   // reserved; unused with the single-signer model
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  deactivated_at: string | null;   // ISO timestamp; non-null = soft-deactivated
  created_at: string;
  updated_at: string;
}
```

### Certificate

```ts
{
  id: string;                 // uuid
  institution_id: string;     // uuid → institutions.id
  institution_name?: string;  // joined in, not a column
  student_name: string;
  registration_number: string;
  course_name: string;
  grade: string;
  issue_date: string;         // date
  certificate_hash: string;   // sha256 hex, unique
  tx_hash: string | null;     // Polygon Amoy tx hash
  ipfs_uri: string | null;    // ipfs://<CID>
  status: "active" | "revoked";
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}
```

### AuditLog

```ts
{
  id: string;
  actor_id: string;           // uuid → profiles.id
  actor_name?: string;        // joined in, not a column
  action: string;             // e.g. "certificate.issued"
  target_table: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
```

---

## Not exposed over REST

These are read or written by the client **directly against Supabase**, under
RLS, and have no Express endpoint:

| Data | Access |
| --- | --- |
| Sign in / up / out, session refresh, TOTP MFA | `supabase.auth.*` |
| Own `profiles` row (read + update) | `profiles_select_own_or_admin`, `profiles_update_own` |
| Own `institutions` row (read) | `institutions_select_own_admin_or_public_approved` |
| Own `notifications` (read, mark read) | `notifications_select_own`, `notifications_update_own` |

## Known gaps

- **Revocation is off-chain only.** `revokeCertificate` updates Postgres but never calls the contract's `revokeCertificate`, so on-chain state still reports the certificate as issued. Anyone verifying purely on-chain would see a stale result.
- **No institution-scoped verification-events endpoint.** The institution "verification activity" screen therefore still reads seeded mock data.
- **No endpoints for device sessions, API keys, institution team members, or support tickets.** Those screens are UI-only. See [mobile-app.md](mobile-app.md#real-vs-mock-backed-features).
