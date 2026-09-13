-- =============================================================================
-- TasdikiDocs — In-app notifications
--
-- Generic, reusable shape so future event types (certificate issued/revoked,
-- etc.) can reuse the same table and RLS — only the (action, title, body,
-- tone, link) values change per event; nothing schema-level.
-- =============================================================================

create type public.notification_tone as enum ('info', 'success', 'warning', 'danger');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  tone public.notification_tone not null default 'info',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_id_idx on public.notifications (profile_id, created_at desc);

comment on table public.notifications is
  'Inserted only by service-role code (e.g. institutionService on approve/reject) — never directly by a client. Clients may only read their own rows and toggle read.';

-- -----------------------------------------------------------------------------
-- RLS: a user can read and mark-as-read only their own notifications.
-- No insert/delete policy is granted to authenticated/anon, so RLS denies
-- those outright by default — every notification is created server-side
-- with the service role, which bypasses RLS entirely.
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (profile_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- A client may only ever flip `read` — everything else about a notification
-- is set once at creation time and is otherwise immutable from the client.
create or replace function public.prevent_notification_content_change()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.tone is distinct from old.tone
    or new.link is distinct from old.link
  then
    raise exception 'only the read status can be changed by the client';
  end if;

  return new;
end;
$$;

create trigger notifications_protect_content
  before update on public.notifications
  for each row execute function public.prevent_notification_content_change();
