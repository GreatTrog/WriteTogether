-- Migration: topics -> subject_links
-- 1) Rename topics table to subject_links (if it exists and subject_links does not)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'topics'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'subject_links'
  ) then
    alter table public.topics rename to subject_links;
  end if;
end $$;

-- 2) Ensure indexes exist under new names
create unique index if not exists subject_links_owner_slug_unique
  on public.subject_links (owner_id, slug)
  where archived_at is null;

create unique index if not exists subject_links_global_slug_unique
  on public.subject_links (slug)
  where owner_id is null and archived_at is null;

-- 3) Drop old topic policies (if still present)
drop policy if exists "topics_select" on public.subject_links;
drop policy if exists "topics_insert" on public.subject_links;
drop policy if exists "topics_update" on public.subject_links;
drop policy if exists "topics_delete" on public.subject_links;

-- 4) Enable RLS and create subject_links policies
alter table public.subject_links enable row level security;

drop policy if exists "subject_links_select" on public.subject_links;
create policy "subject_links_select"
  on public.subject_links
  for select
  using (
    is_admin()
    or owner_id is null
    or owner_id = current_teacher_profile_id()
  );

drop policy if exists "subject_links_insert" on public.subject_links;
create policy "subject_links_insert"
  on public.subject_links
  for insert
  with check (
    (owner_id = current_teacher_profile_id())
    or (is_admin() and owner_id is null)
  );

drop policy if exists "subject_links_update" on public.subject_links;
create policy "subject_links_update"
  on public.subject_links
  for update
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  )
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

drop policy if exists "subject_links_delete" on public.subject_links;
create policy "subject_links_delete"
  on public.subject_links
  for delete
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );
