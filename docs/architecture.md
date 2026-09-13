# Architecture

## Components

| Component | Stack | Responsibility |
| --- | --- | --- |
| `app/` | Expo SDK 57, React Native 0.86, expo-router, TypeScript | All three role UIs (verifier, institution, admin) on iOS, Android, and web |
| `server/` | Node.js, Express 5, TypeScript, Zod, `tsx` in dev | Privileged business logic, on-chain minting, IPFS upload, OTP email, admin aggregates |
| `supabase/` | Postgres 15 + Supabase Auth | System of record: users, institutions, certificates, audit log, notifications |
| `contracts/` | Hardhat, Solidity 0.8.24, OpenZeppelin AccessControl | `CertificateRegistry` — the on-chain anchor for issued certificates |

## Why two backends

The client holds a Supabase **anon key**, which is safe to ship because
every table it touches is protected by row-level security. That makes
Supabase the right channel for data a user owns outright:

- Sign in / sign up / sign out, session persistence, TOTP MFA
- Reading and updating one's own `profiles` row
- Reading one's own `institutions` row
- Reading and marking-read one's own `notifications`

Everything else goes through Express, which holds the Supabase **service
role key** (bypasses RLS) plus the platform wallet key and Thirdweb secret.
Those secrets can never ship in a client bundle, and several operations are
fundamentally not expressible as "rows this user owns":

- **Certificate issuance** — needs the platform wallet to mint on-chain and the Thirdweb secret to pin to IPFS.
- **Institution approval/rejection/suspension** — an admin mutating another tenant's row, with an audit-log entry and a notification as side effects.
- **Admin analytics and global certificate search** — cross-tenant aggregates that RLS is designed to prevent.
- **Password-reset OTP** — must generate, hash, email, and rate-limit a code without an authenticated session.

### Trust boundary

The single most important invariant: **a client can never set its own role,
nor an institution's status.** This is enforced at three independent layers,
so a bug in any one of them is not sufficient to break it:

1. **Route layer** — `requireRole("admin")` on every status-mutating route (`server/src/middleware/auth.ts`).
2. **Service layer** — `status` is never read from a request body anywhere in `institutionService.ts`; it can only change via `approveInstitution` / `rejectInstitution` / `suspendInstitution`, each of which requires an `adminId`.
3. **Database layer** — the `prevent_protected_field_change` trigger rejects any update to `profiles.role` or `institutions.status` / `reviewed_by` / `reviewed_at` unless the connection is using the service role.

`handle_new_user` closes the remaining hole: a self-signup requesting
`role: 'admin'` in its metadata is silently downgraded to `verifier`.

## Authentication

Supabase issues the JWT; Express verifies it but never trusts its claims for
authorization.

```text
app  ──signInWithPassword──► Supabase Auth ──► access token (JWT)
app  ──Bearer <token>──────► Express
                              │
                              ├─ supabaseAdmin.auth.getUser(token)   → verify signature/expiry
                              ├─ SELECT role FROM profiles WHERE id  → authoritative role
                              └─ SELECT deactivated_at FROM institutions (institution role only)
```

Two deliberate choices in `requireAuth`:

- **Role is re-read from the database on every request**, not taken from the token. A token minted before a role change must not carry stale privilege.
- **Deactivation is re-checked on every request.** A soft-deactivated institution's existing access token stays cryptographically valid until it expires; checking only at sign-in would leave a window where a deactivated account could still issue certificates.

### MFA

TOTP via Supabase's built-in MFA (`supabase.auth.mfa.*`). A verified factor
means password sign-in yields an **AAL1** session that the app refuses to
treat as logged in — `signIn()` throws `mfa_required` and the login screen
renders the 6-digit challenge, which elevates the session to **AAL2**.
`restoreSession()` applies the same check so a persisted AAL1 session cannot
silently grant access on app reopen.

MFA is available to all roles and surfaced as a non-blocking prompt on the
institution and admin dashboards (`MfaSetupReminder`). It is **not** a hard
gate — those roles can still operate without it. Making it mandatory would be
a one-line policy change at the `requireAuth`/`Stack.Protected` layer.

## Certificate issuance flow

The most involved path in the system, in `certificateService.issueCertificate`:

```text
1. Load institution, assert status === 'approved' AND deactivated_at IS NULL
2. certificate_hash = sha256(reg_number|student_name|course_name|issue_date)
3. INSERT certificates row  (tx_hash = NULL, ipfs_uri = NULL)
4. Upload metadata JSON → Thirdweb Storage → ipfs://<CID>
5. CertificateRegistry.issueCertificate(0x<hash>, ipfsUri) → wait for receipt
      └─ on failure: DELETE the row from step 3, return 502 MINT_FAILED
6. UPDATE the row with tx_hash + ipfs_uri
7. Write an audit_logs entry (actor = institution.profile_id)
```

Step 5's rollback is the important part: a certificate that could not be
anchored on-chain is not "issued". Leaving the row behind would produce a
record that looks valid in the app but has no blockchain backing — worse
than a clean failure.

The row is inserted *before* minting because `certificate_hash` has a unique
constraint, so the insert is what atomically claims that hash and rejects
duplicates (`23505` → `CERTIFICATE_DUPLICATE`).

### On-chain model: one platform signer

`CertificateRegistry` supports per-institution issuer wallets
(`approveInstitution(wallet)` grants `ISSUER_ROLE`), but the deployed system
uses a **single platform wallet** for all minting.

Rationale: institutions are universities and colleges, not crypto-native
users. Requiring each to custody a funded wallet would make onboarding a
non-starter. Attribution is instead enforced off-chain — an institution
reaches the mint path only after passing `requireRole("institution")`, an
approved-status check, and a deactivation check — which is the same trust
boundary already protecting every other privileged action here.

The trade-off, stated plainly: on-chain data alone cannot prove *which*
institution issued a given certificate; that binding lives in Postgres. If
independent on-chain attribution becomes a requirement, the contract already
supports it and the change is confined to `server/src/lib/contract.ts`.

### Network-layer workarounds

`server/src/lib/contract.ts` contains two non-obvious deviations, both
responses to real failures on the development network — keep the comments if
you refactor:

- **`staticNetwork` on `JsonRpcProvider`.** Ethers' automatic network detection round-trip hung indefinitely; pinning the chain ID skips it.
- **Raw `https.request` for the IPFS upload instead of `fetch`.** Node's native fetch (undici) hung against `storage.thirdweb.com` regardless of forced IP family, while a plain `https.request` with `family: 4` — the same primitive `curl` uses — succeeded in seconds.

## Verification flow

`GET /api/v1/certificates/verify/:idOrRegNumber` is public and
unauthenticated by design — QR scanning must work for someone with no
account.

```text
lookup by UUID (if input matches a UUID) OR by registration_number
   ├─ no match          → result: "not_found"
   ├─ status = revoked  → result: "revoked"
   └─ otherwise         → result: "valid"
always: INSERT verification_events row (feeds admin analytics)
response: Cache-Control: public, max-age=30
```

The UUID guard matters: `certificates.id` is a `uuid` column, and comparing
it to a non-UUID string raises a Postgres error rather than returning no
rows, so the `id.eq` branch is only included when the input is UUID-shaped.

Verification events are recorded for **every** lookup including failures, so
scraping and enumeration attempts are visible in the audit surface.

## Institution deactivation (soft delete)

Originally a client-side no-op, because the honest implementation — deleting
the owning profile — would cascade through `institutions` and destroy every
certificate that institution had ever issued. Certificates must stay
verifiable permanently, independent of the issuer's account status.

Migration `0004` fixes this structurally:

- Adds `institutions.deactivated_at`; deactivation sets a timestamp and deletes nothing.
- Changes `institutions.profile_id` and `certificates.institution_id` foreign keys from `ON DELETE CASCADE` to `ON DELETE RESTRICT`, so a hard delete can no longer silently destroy certificates — it now fails loudly.
- Redefines `approved_institution_id()` to exclude deactivated institutions, which propagates the rule into the RLS policy that gates certificate inserts.

Effect: a deactivated institution cannot sign in or issue, but its
certificates continue to resolve as `valid` on verification.

## Notifications

`notifications` is intentionally generic — `(title, body, tone, link)` — so
new event types need no schema or RLS change. Only institution
approve/reject currently emits one.

- **Writes:** service role only, via `notificationService.create()`. No insert policy is granted to `authenticated`/`anon`, so RLS denies client inserts by default.
- **Reads:** the client queries the table directly; `notifications_select_own` scopes rows to `profile_id = auth.uid()`.
- **Updates:** the client may flip `read` and nothing else — the `prevent_notification_content_change` trigger rejects any other field change from a non-service-role connection.

## Rate limiting

| Scope | Window | Max | Applies to |
| --- | --- | --- | --- |
| `apiLimiter` | 15 min (`RATE_LIMIT_WINDOW_MS`) | 100 (`RATE_LIMIT_MAX`) | All of `/api/v1` |
| `otpLimiter` | 15 min | 5 | `forgot-password`, `verify-otp`, `reset-password` |

The OTP limiter serves two purposes: blunting brute-force against a 6-digit
code, and preventing `forgot-password` from being used as a mail bomb or
account-enumeration oracle. That endpoint also always returns the same
generic message whether or not the address exists.

Separately, `otp_codes.attempt_count` caps verification attempts per code at
5 (`MAX_OTP_ATTEMPTS`), and codes expire after 10 minutes.

## Auditing

`auditLogService.record()` writes to `audit_logs` on every privileged
mutation: institution applied/approved/rejected/suspended/deactivated,
certificate issued/revoked, password reset requested/completed.

`actor_id` is a foreign key to `profiles.id`. A real bug caught during
integration testing: certificate issuance was passing `institutionId` (the
`institutions` PK) as the actor, which is a different table's key entirely
and produced a foreign-key violation the first time real data flowed
through. It now passes `institution.profile_id`. Worth remembering when
adding new audit calls from institution-scoped code.
