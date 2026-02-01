-- Subject links catalog (per-teacher with optional global admin subjects)
create table if not exists public.subject_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null,
  owner_id uuid null references public.teacher_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz null
);

create unique index if not exists subject_links_owner_slug_unique
  on public.subject_links (owner_id, slug)
  where archived_at is null;

create unique index if not exists subject_links_global_slug_unique
  on public.subject_links (slug)
  where owner_id is null and archived_at is null;

alter table public.subject_links enable row level security;

-- Teachers can read their own subject links + global subjects. Admins can read all.
create policy "subject_links_select"
  on public.subject_links
  for select
  using (
    is_admin()
    or owner_id is null
    or owner_id = current_teacher_profile_id()
  );

-- Teachers can create their own subject links.
create policy "subject_links_insert"
  on public.subject_links
  for insert
  with check (
    (owner_id = current_teacher_profile_id())
    or (is_admin() and owner_id is null)
  );

-- Owners can update/delete their own subject links. Admins can manage all.
create policy "subject_links_update"
  on public.subject_links
  for update
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  )
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "subject_links_delete"
  on public.subject_links
  for delete
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );
