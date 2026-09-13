-- =============================================================================
-- TasdikiDocs — Seed the single platform admin account
--
-- There is NO signup path for admin anywhere in the app, by design. This
-- script is the only way an admin account is ever created, and it must be
-- run with the Supabase service role (SQL editor in the Supabase dashboard,
-- or `supabase db execute` / psql against the project's direct connection
-- string with the service role / postgres user — never via the anon/client
-- key, and never from application code).
-- =============================================================================

-- Step 1: Create the auth user (do this once via the Supabase dashboard
-- Auth > Users > "Add user", or via the Admin API):
--
--   supabase.auth.admin.createUser({
--     email: 'admin@tasdikidocs.com',
--     password: '<set a strong password out-of-band, then rotate it>',
--     email_confirm: true
--   })
--
-- This fires the `on_auth_user_created` trigger, which inserts a
-- `profiles` row with role = 'verifier' (the trigger never grants admin).
-- Step 2 below promotes that row to admin — this UPDATE is only permitted
-- because it runs with the service_role, which bypasses the
-- prevent_protected_field_change trigger guard.

-- Step 2: Promote the newly created profile to admin.
-- Replace the email below with the real admin email before running.
update public.profiles
set role = 'admin'
where email = 'admin@tasdikidocs.com';

-- Step 3 (optional but recommended): record the promotion in audit_logs.
insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
select id, 'admin_account_seeded', 'profiles', id, jsonb_build_object('email', email)
from public.profiles
where email = 'admin@tasdikidocs.com';

-- Verify:
-- select id, email, role from public.profiles where role = 'admin';
