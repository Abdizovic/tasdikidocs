-- =============================================================================
-- TasdikiDocs — Security hardening
--
-- Closes every finding raised by the Supabase security advisor, the first of
-- which was emailed as a CRITICAL issue:
--
--   [ERROR] rls_disabled_in_public  — public._migrations is reachable through
--       PostgREST with RLS off. `anon` (i.e. anyone holding the publishable
--       anon key, which ships inside the mobile bundle by design) could read,
--       INSERT into, UPDATE, DELETE from, and TRUNCATE it. Verified against
--       the live database: `set role anon; delete from public._migrations;`
--       succeeded. Wiping that table makes the next `npm run migrate` believe
--       nothing has been applied and re-run 0001 against a populated schema.
--
--   [WARN]  anon/authenticated_security_definer_function_executable — the RLS
--       helper functions were exposed as callable /rest/v1/rpc/ endpoints.
--
--   [WARN]  function_search_path_mutable — trigger functions had no pinned
--       search_path, so whatever schema list the calling role happens to have
--       decided which `now()`/operator/type each unqualified name resolved to.
--
-- Deliberately NOT changed, with reasons, at the bottom of this file.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A private schema. PostgREST only exposes `public` (and `graphql_public`), so
-- anything living here has no REST surface at all — which is the difference
-- between "protected by a policy" and "not reachable in the first place".
--
-- USAGE is still granted to anon/authenticated: RLS policy expressions are
-- evaluated with the privileges of the role running the query, so those roles
-- must be able to resolve and execute the helpers below even though they can
-- never call them directly.
-- -----------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. public._migrations — the emailed CRITICAL issue.
--
-- Moved out of the exposed schema rather than just having RLS switched on.
-- It is migration bookkeeping written by scripts/migrate.js over a direct
-- postgres connection; no client has any business reading it. The grants and
-- RLS below are belt-and-braces in case the schema is ever exposed.
--
-- Normally scripts/migrate.js has already relocated the table by the time this
-- migration runs (its bootstrap does the same move, so history is preserved
-- rather than restarted). This block is here for a database migrated by hand
-- through the SQL editor, per supabase/README.md.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = '_migrations'
  ) then
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'private' and c.relname = '_migrations'
    ) then
      -- Both exist: private is authoritative, public is a stale leftover.
      drop table public._migrations;
    else
      alter table public._migrations set schema private;
    end if;
  end if;
end
$$;

-- A table keeps its grants when it changes schema, and this one inherited the
-- broad public-schema defaults (anon/authenticated held DELETE and TRUNCATE).
revoke all on private._migrations from anon, authenticated, public;
alter table private._migrations enable row level security;
-- No policies, so every non-owner is denied outright. scripts/migrate.js
-- connects as the table's owner (`postgres`), which bypasses RLS — verified
-- before shipping this migration, so migrations keep applying normally.

comment on table private._migrations is
  'Migration bookkeeping for scripts/migrate.js. Lives outside `public` so PostgREST cannot reach it — it was previously world-writable through the REST API (Supabase advisor: rls_disabled_in_public).';

-- -----------------------------------------------------------------------------
-- 2. RLS helper functions — remove their REST surface.
--
-- These are SECURITY DEFINER (they must be: is_admin() reads public.profiles,
-- which is itself RLS-protected, so an invoker-rights version would recurse).
-- Being SECURITY DEFINER *and* in the exposed schema meant anon could call
-- /rest/v1/rpc/is_admin, /rest/v1/rpc/owns_institution?target_institution_id=…
-- and /rest/v1/rpc/approved_institution_id directly.
--
-- Note what is NOT done here: simply revoking EXECUTE breaks the application.
-- Policy expressions run with the querying role's privileges, so revoking
-- EXECUTE from `authenticated` turns an ordinary `select … from profiles` into
-- "permission denied for function is_admin". Confirmed against the live
-- database before choosing this approach.
--
-- Moving the function instead keeps every policy working untouched: a policy
-- stores the function's OID, not its name, so the reference follows the
-- function across schemas and re-renders as `private.is_admin()`.
-- -----------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'is_admin()',
    'owns_institution(uuid)',
    'approved_institution_id()'
  ] loop
    -- to_regprocedure returns null rather than raising when the function is
    -- absent, so re-running against an already-migrated database is a no-op.
    if to_regprocedure('public.' || fn) is not null then
      execute format('alter function public.%s set schema private', fn);
    end if;
  end loop;
end
$$;

-- public.handle_new_user() is intentionally left in place. The advisor flags
-- it under the same rule, but it is a `returns trigger` function: Postgres
-- refuses a direct call with "trigger functions can only be called as
-- triggers", so the RPC endpoint is not callable (verified as `authenticated`
-- against the live database). Relocating it would mean re-pointing the
-- on_auth_user_created trigger on auth.users and re-granting to
-- supabase_auth_admin — real signup-breaking risk to fix a non-exploitable
-- warning, so the finding is accepted rather than actioned.

-- -----------------------------------------------------------------------------
-- 3. Pin search_path on the trigger functions.
--
-- The four SECURITY DEFINER helpers already set it; these three did not. They
-- are SECURITY INVOKER so the exposure is small, but an unpinned search_path
-- means an unqualified name resolves against the *caller's* schema list.
-- ALTER rather than CREATE OR REPLACE so the bodies stay exactly as reviewed
-- in 0001 and 0005.
-- -----------------------------------------------------------------------------
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_protected_field_change() set search_path = public;
alter function public.prevent_notification_content_change() set search_path = public;

-- =============================================================================
-- Findings accepted, not changed
--
-- [INFO] rls_enabled_no_policy on public.otp_codes
--     Working as designed. RLS on with zero policies is exactly how 0002
--     denies all client access to password-reset codes; only the service role
--     (which bypasses RLS) touches that table. Nothing to fix.
--
-- public.certificates SELECT policy is `using (true)`
--     Deliberate — public verifiability is the product. Worth being explicit
--     that this means anon can enumerate the whole table (every student_name,
--     registration_number, course_name, grade), not merely look up one
--     certificate they already hold an identifier for. That is a broader
--     disclosure than a paper certificate, and is tracked as a design question
--     in SECURITY.md rather than silently changed here — narrowing it would
--     break the public verify page and the QR flow.
-- =============================================================================
