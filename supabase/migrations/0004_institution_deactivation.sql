-- =============================================================================
-- TasdikiDocs — Institution self-deactivation (soft delete)
--
-- Deactivating an institution used to be a client-side no-op because the
-- real thing (deleting the owning profile) would cascade-delete the
-- institution row and, transitively, every certificate it ever issued —
-- destroying records that must remain permanently verifiable regardless of
-- what happens to the issuer's account.
--
-- Fix: soft-delete via institutions.deactivated_at (the row, and everything
-- under it, is never removed), and change the profile_id/institution_id
-- foreign keys from CASCADE to RESTRICT so a hard delete is no longer even
-- capable of silently destroying certificates — it now fails loudly instead.
-- =============================================================================

alter table public.institutions add column deactivated_at timestamptz;

comment on column public.institutions.deactivated_at is
  'Set when the institution owner deactivates their account. The row (and all its certificates) is never deleted — the owning profile just loses the ability to log in or issue new certificates. Existing certificates remain fully verifiable.';

-- Defense in depth: a hard delete of a profile that still owns an
-- institution (or an institution that still has certificates) is now
-- blocked outright by Postgres rather than silently cascading data loss.
alter table public.institutions drop constraint institutions_profile_id_fkey;
alter table public.institutions
  add constraint institutions_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete restrict;

alter table public.certificates drop constraint certificates_institution_id_fkey;
alter table public.certificates
  add constraint certificates_institution_id_fkey
  foreign key (institution_id) references public.institutions (id) on delete restrict;

-- A deactivated institution is excluded from this lookup, so the
-- certificates_institution_insert_when_approved RLS policy (which gates on
-- this function) blocks issuance even if a still-valid JWT is used to
-- attempt it directly.
create or replace function public.approved_institution_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select id from public.institutions
  where profile_id = auth.uid() and status = 'approved' and deactivated_at is null
  limit 1;
$$;
