-- =============================================================================
-- TasdikiDocs — Initial schema
-- Roles: institution (issuer, approval-gated), verifier (open signup), admin (seeded only)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('institution', 'verifier', 'admin');
create type public.institution_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.certificate_status as enum ('active', 'revoked');
create type public.otp_purpose as enum ('password_reset');
create type public.verification_result as enum ('valid', 'invalid', 'revoked', 'not_found');

-- -----------------------------------------------------------------------------
-- profiles — one row per auth.users row, created automatically on signup
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'verifier',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. role is server-set only — see prevent_protected_field_change trigger.';

-- -----------------------------------------------------------------------------
-- institutions — one row per institution application/account
-- -----------------------------------------------------------------------------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  institution_name text not null,
  registration_number text not null,
  country text not null,
  website text,
  contact_phone text,
  wallet_address text,
  status public.institution_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_registration_number_unique unique (registration_number)
);

comment on table public.institutions is 'status is server-set only (admin/service-role) — see prevent_protected_field_change trigger. Institutions may only issue certificates while status = approved.';

-- -----------------------------------------------------------------------------
-- certificates — issued by approved institutions
-- -----------------------------------------------------------------------------
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  student_name text not null,
  registration_number text not null,
  course_name text not null,
  grade text,
  issue_date date not null,
  certificate_hash text not null unique,
  tx_hash text,
  ipfs_uri text,
  status public.certificate_status not null default 'active',
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index certificates_institution_id_idx on public.certificates (institution_id);
create index certificates_registration_number_idx on public.certificates (registration_number);
create index certificates_status_idx on public.certificates (status);

comment on table public.certificates is 'tx_hash/ipfs_uri are filled in once the real Thirdweb mint + IPFS upload happen; null until then.';

-- -----------------------------------------------------------------------------
-- otp_codes — backs the forgot-password OTP flow
-- -----------------------------------------------------------------------------
create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null,
  purpose public.otp_purpose not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count int not null default 0,
  created_at timestamptz not null default now()
);

create index otp_codes_user_id_purpose_idx on public.otp_codes (user_id, purpose);

comment on table public.otp_codes is 'Never store the raw OTP — code_hash only. attempt_count caps brute-force guesses (enforce max, e.g. 5, in the edge function).';

-- -----------------------------------------------------------------------------
-- audit_logs — every privileged/admin action
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- -----------------------------------------------------------------------------
-- verification_events — every public certificate lookup, feeds admin analytics
-- -----------------------------------------------------------------------------
create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates (id) on delete set null,
  searched_value text not null,
  result public.verification_result not null,
  created_at timestamptz not null default now()
);

create index verification_events_certificate_id_idx on public.verification_events (certificate_id);
create index verification_events_created_at_idx on public.verification_events (created_at);

-- -----------------------------------------------------------------------------
-- updated_at maintenance trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Non-negotiable rule: role / institution_status are server-set only.
-- Any UPDATE that changes a protected column is rejected unless performed
-- with the service_role key (used by admin tooling / edge functions).
-- -----------------------------------------------------------------------------
create or replace function public.prevent_protected_field_change()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if TG_TABLE_NAME = 'profiles' and new.role is distinct from old.role then
    raise exception 'role cannot be changed by the client';
  end if;

  if TG_TABLE_NAME = 'institutions' and (
    new.status is distinct from old.status
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
  ) then
    raise exception 'institution status/review fields cannot be changed by the client';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.prevent_protected_field_change();

create trigger institutions_protect_status
  before update on public.institutions
  for each row execute function public.prevent_protected_field_change();

-- -----------------------------------------------------------------------------
-- Auto-create a profile row on signup.
-- role is only ever taken from client metadata for the open, unprivileged
-- 'verifier' path — institution/admin roles are never granted this way.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    'verifier'
  );

  -- The self-signup path may only ever create verifier or institution
  -- accounts; admin is never assignable from client metadata.
  if requested_role = 'admin' then
    requested_role := 'verifier';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    requested_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
