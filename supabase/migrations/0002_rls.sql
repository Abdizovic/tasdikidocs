-- =============================================================================
-- TasdikiDocs — Row Level Security
-- Every table has RLS enabled. The service_role key (used server-side only,
-- e.g. from the Express backend or an edge function) bypasses RLS entirely,
-- which is how admin approval/rejection/suspension is implemented safely —
-- never through a direct client-side database write.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: is the current JWT's role claim 'admin'?
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_institution(target_institution_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.institutions
    where id = target_institution_id and profile_id = auth.uid()
  );
$$;

create or replace function public.approved_institution_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select id from public.institutions
  where profile_id = auth.uid() and status = 'approved'
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
  -- role changes on this row are still blocked by prevent_protected_field_change

-- inserts happen only via the handle_new_user trigger (security definer),
-- so no client-facing insert policy is needed/granted.

-- -----------------------------------------------------------------------------
-- institutions
-- -----------------------------------------------------------------------------
alter table public.institutions enable row level security;

create policy "institutions_select_own_admin_or_public_approved"
  on public.institutions for select
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or status = 'approved'  -- verifiers need to see issuer name on a verified certificate
  );

create policy "institutions_insert_own_application"
  on public.institutions for insert
  with check (profile_id = auth.uid());

create policy "institutions_update_own_profile_fields"
  on public.institutions for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
  -- status/reviewed_* changes on this row are still blocked by prevent_protected_field_change

-- -----------------------------------------------------------------------------
-- certificates
-- -----------------------------------------------------------------------------
alter table public.certificates enable row level security;

create policy "certificates_public_can_verify"
  on public.certificates for select
  using (true);
  -- certificate verification must be publicly readable by design; no PII
  -- beyond student_name/course is stored, matching a public paper certificate

create policy "certificates_institution_insert_when_approved"
  on public.certificates for insert
  with check (institution_id = public.approved_institution_id());

create policy "certificates_institution_update_own"
  on public.certificates for update
  using (public.owns_institution(institution_id))
  with check (public.owns_institution(institution_id));

-- -----------------------------------------------------------------------------
-- otp_codes — never exposed to clients directly; only service_role
-- (an edge function) reads/writes these. No policies granted to
-- authenticated/anon means RLS denies all client access by default.
-- -----------------------------------------------------------------------------
alter table public.otp_codes enable row level security;

-- -----------------------------------------------------------------------------
-- audit_logs — admin read-only; writes happen only via service_role from
-- server-side actions (never a direct client insert).
-- -----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- verification_events — admin can read for analytics; inserts happen via
-- service_role from the verification endpoint (keeps searched_value logging
-- out of client hands, avoiding log-injection/spoofed-analytics concerns).
-- -----------------------------------------------------------------------------
alter table public.verification_events enable row level security;

create policy "verification_events_admin_select"
  on public.verification_events for select
  using (public.is_admin());
