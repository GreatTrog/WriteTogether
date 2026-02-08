-- WriteTogether security hardening (RLS and table access)
-- Run this in Supabase SQL Editor (staging first, then production).
--
-- Prerequisites:
-- - Helper functions already used by this project:
--   - is_admin()
--   - current_teacher_profile_id()
--
-- Scope:
-- - Hardens access to classes, pupils, assignments, shared_files, pupil_drafts,
--   word_banks, and word_bank_items.
-- - Leaves subject_links policies in their dedicated docs/migration files.

begin;

-- Helper that avoids recursive table lookups in RLS policies.
-- Reads pupil_id directly from JWT user_metadata.
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

-- 1) Ensure RLS is enabled on core tables
alter table if exists public.classes enable row level security;
alter table if exists public.pupils enable row level security;
alter table if exists public.assignments enable row level security;
alter table if exists public.shared_files enable row level security;
alter table if exists public.pupil_drafts enable row level security;
alter table if exists public.word_banks enable row level security;
alter table if exists public.word_bank_items enable row level security;

-- 2) Remove existing policies on these tables so hardening is deterministic
do $$
declare
  policy_row record;
  target_table text;
  target_tables text[] := array[
    'classes',
    'pupils',
    'assignments',
    'shared_files',
    'pupil_drafts',
    'word_banks',
    'word_bank_items'
  ];
begin
  foreach target_table in array target_tables loop
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_row.policyname,
        target_table
      );
    end loop;
  end loop;
end $$;

-- 3) classes
create policy "classes_select_teacher_admin"
  on public.classes
  for select
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "classes_insert_teacher_admin"
  on public.classes
  for insert
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "classes_update_teacher_admin"
  on public.classes
  for update
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  )
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "classes_delete_teacher_admin"
  on public.classes
  for delete
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );

-- Pupil can read their own class only.
create policy "classes_select_pupil_own_class"
  on public.classes
  for select
  using (
    exists (
      select 1
      from public.pupils p
      where p.id = current_pupil_claim_id()
        and p.class_id = classes.id
    )
  );

-- 4) pupils
create policy "pupils_select_teacher_admin"
  on public.pupils
  for select
  using (
    is_admin()
    or owner_id = current_teacher_profile_id()
  );

create policy "pupils_insert_teacher_admin"
  on public.pupils
  for insert
  with check (
    is_admin()
    or owner_id = current_teacher_profile_id()
  );

create policy "pupils_update_teacher_admin"
  on public.pupils
  for update
  using (
    is_admin()
    or owner_id = current_teacher_profile_id()
  )
  with check (
    is_admin()
    or owner_id = current_teacher_profile_id()
  );

create policy "pupils_delete_teacher_admin"
  on public.pupils
  for delete
  using (
    is_admin()
    or owner_id = current_teacher_profile_id()
  );

-- Pupil can read only their own profile row.
create policy "pupils_select_self"
  on public.pupils
  for select
  using (
    id = current_pupil_claim_id()
  );

-- 5) assignments
create policy "assignments_select_teacher_admin"
  on public.assignments
  for select
  using (
    is_admin()
    or exists (
      select 1
      from public.classes c
      where c.id = assignments.class_id
        and c.owner_id = current_teacher_profile_id()
    )
  );

create policy "assignments_insert_teacher_admin"
  on public.assignments
  for insert
  with check (
    is_admin()
    or exists (
      select 1
      from public.classes c
      where c.id = assignments.class_id
        and c.owner_id = current_teacher_profile_id()
    )
  );

create policy "assignments_update_teacher_admin"
  on public.assignments
  for update
  using (
    is_admin()
    or exists (
      select 1
      from public.classes c
      where c.id = assignments.class_id
        and c.owner_id = current_teacher_profile_id()
    )
  )
  with check (
    is_admin()
    or exists (
      select 1
      from public.classes c
      where c.id = assignments.class_id
        and c.owner_id = current_teacher_profile_id()
    )
  );

create policy "assignments_delete_teacher_admin"
  on public.assignments
  for delete
  using (
    is_admin()
    or exists (
      select 1
      from public.classes c
      where c.id = assignments.class_id
        and c.owner_id = current_teacher_profile_id()
    )
  );

-- Pupil can read assignments for their own class.
create policy "assignments_select_pupil_class"
  on public.assignments
  for select
  using (
    exists (
      select 1
      from public.pupils p
      where p.id = current_pupil_claim_id()
        and p.class_id = assignments.class_id
    )
  );

-- 6) shared_files
create policy "shared_files_select_teacher_admin"
  on public.shared_files
  for select
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "shared_files_insert_teacher_admin"
  on public.shared_files
  for insert
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "shared_files_update_teacher_admin"
  on public.shared_files
  for update
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  )
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "shared_files_delete_teacher_admin"
  on public.shared_files
  for delete
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );

-- Pupil can insert their own export rows, scoped to class owner.
create policy "shared_files_insert_pupil"
  on public.shared_files
  for insert
  with check (
    exists (
      select 1
      from public.pupils p
      left join public.classes c on c.id = p.class_id
      where p.id = current_pupil_claim_id()
        and (p.owner_id = shared_files.owner_id or c.owner_id = shared_files.owner_id)
    )
  );

-- 7) pupil_drafts
create policy "pupil_drafts_select_self"
  on public.pupil_drafts
  for select
  using (
    pupil_id = current_pupil_claim_id()
  );

create policy "pupil_drafts_insert_self"
  on public.pupil_drafts
  for insert
  with check (
    pupil_id = current_pupil_claim_id()
  );

create policy "pupil_drafts_update_self"
  on public.pupil_drafts
  for update
  using (
    pupil_id = current_pupil_claim_id()
  )
  with check (
    pupil_id = current_pupil_claim_id()
  );

create policy "pupil_drafts_delete_self"
  on public.pupil_drafts
  for delete
  using (
    pupil_id = current_pupil_claim_id()
  );

-- Teacher/admin read access to drafts for safeguarding and support.
create policy "pupil_drafts_select_teacher_admin"
  on public.pupil_drafts
  for select
  using (
    is_admin()
    or exists (
      select 1
      from public.pupils p
      left join public.classes c on c.id = p.class_id
      where p.id = pupil_drafts.pupil_id
        and (p.owner_id = current_teacher_profile_id() or c.owner_id = current_teacher_profile_id())
    )
  );

-- 8) word_banks and word_bank_items
create policy "word_banks_select_teacher_admin_owner"
  on public.word_banks
  for select
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "word_banks_insert_teacher_admin_owner"
  on public.word_banks
  for insert
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "word_banks_update_teacher_admin_owner"
  on public.word_banks
  for update
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  )
  with check (
    is_admin() or owner_id = current_teacher_profile_id()
  );

create policy "word_banks_delete_teacher_admin_owner"
  on public.word_banks
  for delete
  using (
    is_admin() or owner_id = current_teacher_profile_id()
  );

-- Pupils can read banks assigned to their class.
create policy "word_banks_select_pupil_assigned"
  on public.word_banks
  for select
  using (
    exists (
      select 1
      from public.assignments a
      join public.pupils p on p.class_id = a.class_id
      where p.id = current_pupil_claim_id()
        and word_banks.id = any (coalesce(a.word_bank_ids, array[]::uuid[]))
    )
  );

create policy "word_bank_items_select_teacher_admin_owner"
  on public.word_bank_items
  for select
  using (
    exists (
      select 1
      from public.word_banks wb
      where wb.id = word_bank_items.bank_id
        and (is_admin() or wb.owner_id = current_teacher_profile_id())
    )
  );

create policy "word_bank_items_insert_teacher_admin_owner"
  on public.word_bank_items
  for insert
  with check (
    exists (
      select 1
      from public.word_banks wb
      where wb.id = word_bank_items.bank_id
        and (is_admin() or wb.owner_id = current_teacher_profile_id())
    )
  );

create policy "word_bank_items_update_teacher_admin_owner"
  on public.word_bank_items
  for update
  using (
    exists (
      select 1
      from public.word_banks wb
      where wb.id = word_bank_items.bank_id
        and (is_admin() or wb.owner_id = current_teacher_profile_id())
    )
  )
  with check (
    exists (
      select 1
      from public.word_banks wb
      where wb.id = word_bank_items.bank_id
        and (is_admin() or wb.owner_id = current_teacher_profile_id())
    )
  );

create policy "word_bank_items_delete_teacher_admin_owner"
  on public.word_bank_items
  for delete
  using (
    exists (
      select 1
      from public.word_banks wb
      where wb.id = word_bank_items.bank_id
        and (is_admin() or wb.owner_id = current_teacher_profile_id())
    )
  );

-- Pupils can read items for assigned banks.
create policy "word_bank_items_select_pupil_assigned"
  on public.word_bank_items
  for select
  using (
    exists (
      select 1
      from public.assignments a
      join public.pupils p on p.class_id = a.class_id
      where p.id = current_pupil_claim_id()
        and word_bank_items.bank_id = any (coalesce(a.word_bank_ids, array[]::uuid[]))
    )
  );

commit;
