# Data Model

Postgres on Supabase. Migrations live in `supabase/migrations/` and are
applied in filename order by `server/scripts/migrate.js`.

## Migration history

| File | Purpose |
| --- | --- |
| `0001_init.sql` | Enums, all core tables, `updated_at` triggers, protected-field trigger, signup trigger |
| `0002_rls.sql` | Row-level security on every table, plus the `is_admin()` / `owns_institution()` / `approved_institution_id()` helpers |
| `0003_profile_fields.sql` | Splits `full_name` into `first_name`/`last_name`, adds `phone`, updates the signup trigger |
| `0004_institution_deactivation.sql` | `deactivated_at` soft delete; `CASCADE` → `RESTRICT` on two foreign keys; deactivation-aware `approved_institution_id()` |
| `0005_notifications.sql` | `notifications` table, RLS, content-immutability trigger |
| `0006_security_hardening.sql` | Adds the `private` schema and moves `_migrations` and the three RLS helpers into it; pins `search_path` on the trigger functions |

## Entity relationships

```text
auth.users (Supabase-managed)
    │ 1:1  (created by handle_new_user trigger)
    ▼
profiles ──1:1──► institutions ──1:N──► certificates ──1:N──► verification_events
    │                                        (ON DELETE SET NULL)
    ├──1:N──► otp_codes
    ├──1:N──► notifications
    └──1:N──► audit_logs (as actor_id)
```

## Enums

| Type | Values |
| --- | --- |
| `user_role` | `institution`, `verifier`, `admin` |
| `institution_status` | `pending`, `approved`, `rejected`, `suspended` |
| `certificate_status` | `active`, `revoked` |
| `otp_purpose` | `password_reset` |
| `verification_result` | `valid`, `invalid`, `revoked`, `not_found` |
| `notification_tone` | `info`, `success`, `warning`, `danger` |

## Tables

### `profiles`

One row per authenticated user, created automatically by the
`on_auth_user_created` trigger.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | → `auth.users(id)` `ON DELETE CASCADE` |
| `first_name`, `last_name` | `text` | Added in `0003` |
| `full_name` | `text` | Derived from first/last if not supplied |
| `email` | `text` | Mirrors `auth.users.email` |
| `phone` | `text` | Nullable |
| `role` | `user_role` | Default `verifier`. **Server-set only** |
| `avatar_url` | `text` | Nullable |
| `created_at`, `updated_at` | `timestamptz` | |

### `institutions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `profile_id` | `uuid` UNIQUE | → `profiles(id)` **`ON DELETE RESTRICT`** (was `CASCADE` before `0004`) |
| `institution_name` | `text` | |
| `registration_number` | `text` UNIQUE | |
| `country` | `text` | |
| `website`, `contact_phone`, `wallet_address` | `text` | Nullable. `wallet_address` is reserved and unused under the single-signer model |
| `status` | `institution_status` | Default `pending`. **Server-set only** |
| `rejection_reason` | `text` | Also used for suspension reason |
| `reviewed_by` | `uuid` | → `profiles(id)`. **Server-set only** |
| `reviewed_at` | `timestamptz` | **Server-set only** |
| `deactivated_at` | `timestamptz` | Added in `0004`. Non-null = soft-deactivated |
| `created_at`, `updated_at` | `timestamptz` | |

### `certificates`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `institution_id` | `uuid` | → `institutions(id)` **`ON DELETE RESTRICT`** (was `CASCADE` before `0004`) |
| `student_name`, `registration_number`, `course_name` | `text` | |
| `grade` | `text` | Nullable |
| `issue_date` | `date` | |
| `certificate_hash` | `text` UNIQUE | `sha256(reg_number\|student_name\|course_name\|issue_date)`. The uniqueness constraint is what prevents duplicate issuance |
| `tx_hash` | `text` | Polygon Amoy transaction hash; null only mid-issuance |
| `ipfs_uri` | `text` | `ipfs://<CID>`; null only mid-issuance |
| `status` | `certificate_status` | Default `active` |
| `revoked_at`, `revoked_reason` | | Nullable |
| `created_at`, `updated_at` | `timestamptz` | |

Indexes on `institution_id`, `registration_number`, and `status`.

### `otp_codes`

Backs the forgot-password flow. **Never stores the raw code** — only a
bcrypt hash.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` | → `profiles(id)` `ON DELETE CASCADE` |
| `code_hash` | `text` | bcrypt hash of the 6-digit code |
| `purpose` | `otp_purpose` | |
| `expires_at` | `timestamptz` | 10 minutes after creation |
| `consumed_at` | `timestamptz` | Set on successful password reset; prevents reuse |
| `attempt_count` | `int` | Capped at 5 in `authService` |

### `audit_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `actor_id` | `uuid` | → `profiles(id)`. For institution actions this is `institution.profile_id`, **not** the institution id |
| `action` | `text` | e.g. `institution.approved`, `certificate.issued` |
| `target_table`, `target_id` | | What was mutated |
| `metadata` | `jsonb` | Action-specific detail, default `{}` |
| `created_at` | `timestamptz` | |

Recorded actions: `institution.applied` · `institution.approved` ·
`institution.rejected` · `institution.suspended` ·
`institution.deactivated` · `certificate.issued` · `certificate.revoked` ·
`auth.password_reset_requested` · `auth.password_reset_completed`.

### `verification_events`

Written on **every** public verification lookup, including failures.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `certificate_id` | `uuid` | → `certificates(id)` `ON DELETE SET NULL`; null when nothing matched |
| `searched_value` | `text` | Raw user input |
| `result` | `verification_result` | |
| `created_at` | `timestamptz` | Indexed for the 30-day analytics window |

### `notifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `profile_id` | `uuid` | → `profiles(id)` `ON DELETE CASCADE` |
| `title`, `body` | `text` | |
| `tone` | `notification_tone` | Default `info` |
| `link` | `text` | Optional in-app deep link |
| `read` | `boolean` | Default `false`; the only field a client may change |
| `created_at` | `timestamptz` | |

Index on `(profile_id, created_at desc)`.

## Triggers

| Trigger | Table(s) | Behaviour |
| --- | --- | --- |
| `*_set_updated_at` | `profiles`, `institutions`, `certificates` | Maintains `updated_at` |
| `profiles_protect_role` | `profiles` | Rejects any change to `role` unless `auth.role() = 'service_role'` |
| `institutions_protect_status` | `institutions` | Rejects changes to `status`, `reviewed_by`, `reviewed_at` unless service role |
| `notifications_protect_content` | `notifications` | Rejects changes to anything but `read` unless service role |
| `on_auth_user_created` | `auth.users` | Creates the matching `profiles` row; **downgrades a requested `admin` role to `verifier`** |

`prevent_protected_field_change` is the database-level half of the trust
boundary described in [architecture.md](architecture.md#trust-boundary). RLS
alone is insufficient here: a user legitimately has UPDATE permission on
their own `profiles`/`institutions` row, so without this trigger they could
update *their own row* to grant themselves `admin` or `approved`. The
trigger constrains *which columns* may change, which RLS cannot express.

## Row-level security

RLS is enabled on **every** table. The service-role key used by the Express
API bypasses RLS entirely — that is how admin actions are performed safely
without ever granting a client the corresponding write policy.

### Helper functions

All are `security definer` so they can read `profiles` regardless of the
caller's own policies, and all live in the **`private`** schema as of `0006`
so PostgREST cannot expose them as `/rest/v1/rpc/…` endpoints. Policies
reference them by OID, so the move required no policy changes.

| Function | Returns |
| --- | --- |
| `private.is_admin()` | Whether `auth.uid()`'s profile has `role = 'admin'` |
| `private.owns_institution(uuid)` | Whether `auth.uid()` owns that institution |
| `private.approved_institution_id()` | The caller's institution id, **only if** `status = 'approved'` **and** `deactivated_at is null` |

### Policies

| Table | Policy | Rule |
| --- | --- | --- |
| `profiles` | `profiles_select_own_or_admin` | SELECT where `id = auth.uid()` or caller is admin |
| | `profiles_update_own` | UPDATE own row (column changes still trigger-constrained) |
| | *(no insert policy)* | Inserts happen only via the `security definer` signup trigger |
| `institutions` | `institutions_select_own_admin_or_public_approved` | SELECT own row, or any row if admin, or **any approved institution** — verifiers must be able to see the issuer name on a verified certificate |
| | `institutions_insert_own_application` | INSERT only with `profile_id = auth.uid()` |
| | `institutions_update_own_profile_fields` | UPDATE own row (status fields still trigger-blocked) |
| `certificates` | `certificates_public_can_verify` | SELECT `using (true)` — **fully public by design** |
| | `certificates_institution_insert_when_approved` | INSERT only where `institution_id = approved_institution_id()` |
| | `certificates_institution_update_own` | UPDATE only own institution's certificates |
| `otp_codes` | *(none)* | RLS enabled with no policies = all client access denied; service role only |
| `audit_logs` | `audit_logs_admin_select` | Admin read-only; writes are service-role only |
| `verification_events` | `verification_events_admin_select` | Admin read-only; inserts are service-role only, keeping `searched_value` out of client hands |
| `notifications` | `notifications_select_own` | SELECT where `profile_id = auth.uid()` |
| | `notifications_update_own` | UPDATE own rows; content immutability enforced by trigger |
| | *(no insert policy)* | Service-role only |

**On public certificate reads:** `certificates_public_can_verify` allowing
`select using (true)` is intentional, not an oversight. Verification must
work for an unauthenticated stranger scanning a QR code. The stored fields
(student name, course, grade, issue date) are exactly what appears on a
printed certificate that the holder already shows to employers. No national
ID, date of birth, contact details, or other sensitive PII is stored on this
table.

## Operational notes

- **Applying migrations:** `cd server && npm run migrate`, which connects via `DATABASE_POOL_URL` (the PgBouncer pooler on port 6543) and runs each file in order.
- **Seeding the admin:** `node server/scripts/seed-admin.js <email> [password]`. It creates the auth user, then promotes `profiles.role` to `admin` using the service role — the only way an admin can come into existence, since the signup trigger refuses to grant that role.
- **Adding a notification type:** no schema change needed. Call `notificationService.create({ profileId, title, body, tone, link })` from the relevant service.
