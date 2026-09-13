-- =============================================================================
-- TasdikiDocs — Profile name split + phone
--
-- The frontend collects first/last name separately and a phone number for
-- every account (not just institutions, which already had contact_phone).
-- This brings public.profiles in line with that, and updates the signup
-- trigger to populate the new columns from auth signup metadata.
-- =============================================================================

alter table public.profiles
  add column first_name text not null default '',
  add column last_name text not null default '',
  add column phone text;

alter table public.profiles alter column first_name drop default;
alter table public.profiles alter column last_name drop default;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role public.user_role;
  meta_first_name text;
  meta_last_name text;
  meta_full_name text;
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

  meta_first_name := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  meta_last_name := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  meta_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    trim(both ' ' from (meta_first_name || ' ' || meta_last_name))
  );

  insert into public.profiles (id, first_name, last_name, full_name, email, phone, role)
  values (
    new.id,
    meta_first_name,
    meta_last_name,
    meta_full_name,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    requested_role
  );

  return new;
end;
$$;
