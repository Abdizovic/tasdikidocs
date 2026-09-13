# TasdikiDocs — Supabase

SQL source for the live Supabase project that backs both the app and the
Express API. Full schema documentation — tables, triggers, and every RLS
policy — is in [../docs/data-model.md](../docs/data-model.md).

## Structure

```text
supabase/
├── migrations/
│   ├── 0001_init.sql                     — enums, tables, triggers, handle_new_user
│   ├── 0002_rls.sql                      — RLS policies + helper functions
│   ├── 0003_profile_fields.sql           — first/last name split, phone
│   ├── 0004_institution_deactivation.sql — soft delete; CASCADE → RESTRICT
│   ├── 0005_notifications.sql            — notifications table, RLS, immutability trigger
│   └── 0006_security_hardening.sql       — private schema; _migrations and RLS
│                                           helpers moved out of PostgREST's reach
├── functions/                            — edge-function stubs, superseded by
│   ├── approve-institution/                the Express routes in
│   └── request-otp/                        server/src/routes/
└── seed_admin.sql                        — manual, one-time platform admin creation
```

> The `functions/` directory is historical. Institution approval and the OTP
> flow are both implemented in the Express API (`server/src/services/`), and
> that is what the app calls — see `app/src/lib/mockApi.ts`. Nothing in the
> running system depends on these stubs.

Migrations are normally applied with `cd server && npm run migrate`, which
runs each file in order over `DATABASE_POOL_URL`.

## Applying migrations to a real project

Once a Supabase project exists:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste the contents of `migrations/0001_init.sql` then `migrations/0002_rls.sql`
into the Supabase SQL editor, in that order (RLS policies reference tables/
functions created in the first file).

## Seeding the admin account

There is **no signup path for admin anywhere in the app** — this is enforced
structurally, not just by convention. Follow the steps at the top of
`seed_admin.sql`: create the auth user once via the dashboard or Admin API,
then run the SQL in that file (with the service role) to promote that one
profile to `role = 'admin'`. This is the only account creation path that ever
sets `role = 'admin'`.

## The `private` schema

PostgREST serves `public` (plus `graphql_public`), and nothing else. Anything
in `public` is therefore reachable by anyone holding the anon key — which ships
inside the mobile bundle by design and is not a secret. `private` exists for
things that must never have a REST endpoint:

- `private._migrations` — migration bookkeeping for `scripts/migrate.js`.
- `private.is_admin()`, `private.owns_institution()`,
  `private.approved_institution_id()` — `SECURITY DEFINER` helpers that RLS
  policies call.

The helpers are moved rather than having `EXECUTE` revoked, because RLS policy
expressions run with the *querying* role's privileges: revoking `EXECUTE` from
`authenticated` turns an ordinary `select … from profiles` into
`permission denied for function is_admin`. Moving works because a policy stores
the function's OID, so the reference follows the function across schemas.

`anon`/`authenticated` keep `USAGE` on the schema for exactly that reason. That
is safe — the schema is not exposed, so there is no `/rest/v1/rpc/…` route to
reach the functions through.

**If you add a helper function or a bookkeeping table, put it in `private`.**

## Why role/status changes are trigger-enforced, not just RLS

`profiles.role` and `institutions.status` (plus `reviewed_by`/`reviewed_at`)
are protected by a `BEFORE UPDATE` trigger (`prevent_protected_field_change`
in `0001_init.sql`) that raises an exception on any change to those columns
unless `auth.role() = 'service_role'`. RLS `WITH CHECK` clauses can express
"you may only touch your own row," but expressing "...except this one column"
cleanly needs a trigger — this is the actual enforcement mechanism behind the
spec's non-negotiable rule that role/status are server-set only.

## Connection pooling

When the Express backend talks to Postgres directly (rather than through
`supabase-js`), use the **pooled** connection string from
Project Settings → Database → Connection pooling (port `6543`, PgBouncer in
transaction mode), not the direct connection (port `5432`). This is what
`DATABASE_POOL_URL` in `server/.env.example` refers to. The direct connection
has a low connection cap and will exhaust quickly under normal API traffic.

## Backups

Supabase takes automatic daily backups on paid plans, with Point-in-Time
Recovery (PITR) available as an add-on. Before going to production: confirm
the project's backup plan in Project Settings → Database → Backups, and if
handling real student records, enable PITR so a bad migration or accidental
delete is recoverable to the minute rather than the last daily snapshot.

## Storage note

Certificate *documents* are intended to live on IPFS per the spec (only the
hash goes on-chain), not in Supabase Storage. If IPFS pinning becomes a
reliability concern later, a Supabase Storage bucket (`certificate-documents`,
private, signed-URL access only) is a reasonable staging fallback — deferred
for now since it isn't part of the current mock-data phase.
