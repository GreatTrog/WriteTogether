-- WriteTogether GDPR operational controls (retention + audit trail)
-- Run this after reviewing legal/DPO requirements and adjusting durations.
-- Execute in Supabase SQL Editor (staging first, then production).

begin;

-- Helper that avoids recursive table lookups when audit trigger captures pupil identity.
create or replace function public.current_pupil_claim_id()
returns uuid
language sql
stable
set search_path = public, auth, pg_catalog
as $$
  select
    case
      when coalesce(auth.jwt() -> 'user_metadata' ->> 'pupil_id', '') ~*
           '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (auth.jwt() -> 'user_metadata' ->> 'pupil_id')::uuid
      else null
    end
$$;

-- 1) Central retention configuration
create table if not exists public.data_retention_config (
  key text primary key,
  retention_days integer not null check (retention_days > 0),
  updated_at timestamptz not null default now()
);

alter table public.data_retention_config enable row level security;

drop policy if exists "data_retention_config_select_admin_only" on public.data_retention_config;
create policy "data_retention_config_select_admin_only"
  on public.data_retention_config
  for select
  using (is_admin());

drop policy if exists "data_retention_config_insert_admin_only" on public.data_retention_config;
create policy "data_retention_config_insert_admin_only"
  on public.data_retention_config
  for insert
  with check (is_admin());

drop policy if exists "data_retention_config_update_admin_only" on public.data_retention_config;
create policy "data_retention_config_update_admin_only"
  on public.data_retention_config
  for update
  using (is_admin())
  with check (is_admin());

insert into public.data_retention_config (key, retention_days)
values
  ('pupil_drafts', 180),
  ('shared_files', 365),
  ('pupils_archived', 730)
on conflict (key) do update
set retention_days = excluded.retention_days,
    updated_at = now();

-- 2) Audit log for high-risk table changes
create table if not exists public.data_access_audit (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_auth_user_id uuid null,
  actor_role text null,
  actor_teacher_profile_id uuid null,
  actor_pupil_id uuid null,
  action text not null,
  table_name text not null,
  record_id text null,
  old_data jsonb null,
  new_data jsonb null
);

create index if not exists data_access_audit_occurred_at_idx
  on public.data_access_audit (occurred_at desc);

create index if not exists data_access_audit_table_name_idx
  on public.data_access_audit (table_name, occurred_at desc);

alter table public.data_access_audit enable row level security;

drop policy if exists "data_access_audit_select_admin_only" on public.data_access_audit;
create policy "data_access_audit_select_admin_only"
  on public.data_access_audit
  for select
  using (is_admin());

drop policy if exists "data_access_audit_insert_admin_only" on public.data_access_audit;
create policy "data_access_audit_insert_admin_only"
  on public.data_access_audit
  for insert
  with check (is_admin());

-- 3) Trigger function to audit INSERT/UPDATE/DELETE
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_auth_user_id uuid;
  actor_role text;
  actor_teacher_profile_id uuid;
  actor_pupil_id uuid;
  record_id text;
begin
  actor_auth_user_id := auth.uid();
  actor_role := auth.jwt() -> 'user_metadata' ->> 'role';
  actor_teacher_profile_id := current_teacher_profile_id();
  actor_pupil_id := current_pupil_claim_id();

  record_id := coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'));

  insert into public.data_access_audit (
    actor_auth_user_id,
    actor_role,
    actor_teacher_profile_id,
    actor_pupil_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  )
  values (
    actor_auth_user_id,
    actor_role,
    actor_teacher_profile_id,
    actor_pupil_id,
    tg_op,
    tg_table_name,
    record_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- 4) Attach audit triggers to child-data tables
drop trigger if exists audit_pupils_trigger on public.pupils;
create trigger audit_pupils_trigger
after insert or update or delete on public.pupils
for each row execute function public.audit_row_change();

drop trigger if exists audit_pupil_drafts_trigger on public.pupil_drafts;
create trigger audit_pupil_drafts_trigger
after insert or update or delete on public.pupil_drafts
for each row execute function public.audit_row_change();

drop trigger if exists audit_shared_files_trigger on public.shared_files;
create trigger audit_shared_files_trigger
after insert or update or delete on public.shared_files
for each row execute function public.audit_row_change();

-- 5) Retention purge function
create or replace function public.purge_expired_child_data()
returns table(purged_table text, purged_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  drafts_days integer;
  files_days integer;
  archived_pupils_days integer;
  purged bigint;
begin
  select retention_days into drafts_days
  from public.data_retention_config
  where key = 'pupil_drafts';

  select retention_days into files_days
  from public.data_retention_config
  where key = 'shared_files';

  select retention_days into archived_pupils_days
  from public.data_retention_config
  where key = 'pupils_archived';

  drafts_days := coalesce(drafts_days, 180);
  files_days := coalesce(files_days, 365);
  archived_pupils_days := coalesce(archived_pupils_days, 730);

  delete from public.pupil_drafts
  where archived = true
    and coalesce(updated_at, created_at, now()) < now() - make_interval(days => drafts_days);
  get diagnostics purged = row_count;
  return query select 'pupil_drafts'::text, purged;

  delete from public.shared_files
  where coalesce(saved_at, created_at, now()) < now() - make_interval(days => files_days);
  get diagnostics purged = row_count;
  return query select 'shared_files'::text, purged;

  delete from public.pupils
  where archived_at is not null
    and archived_at < now() - make_interval(days => archived_pupils_days);
  get diagnostics purged = row_count;
  return query select 'pupils'::text, purged;
end;
$$;

commit;

-- Optional: schedule with pg_cron (if enabled in your Supabase project)
-- select cron.schedule(
--   'purge-expired-child-data-daily',
--   '15 3 * * *',
--   $$select * from public.purge_expired_child_data();$$
-- );
