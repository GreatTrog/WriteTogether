# Teacher class & pupil management (Supabase + bulk import + rollovers)

## Goal
Deliver teacher console tooling to manage classes and pupils end-to-end: edit, archive (soft delete), delete with confirmation, bulk upload, and phase rollover, while supporting both Google OAuth and username/password pupil logins.

## Current behaviour
- Classes and pupils are created client-side via `useTeacherStore`.
- No edit/delete/rollback; no bulk import or rollover.
- Teacher console is gated behind Google OAuth, but pupil auth is not implemented.
- Shared files now sync to Supabase storage; teacher profiles are created by trigger.

## Proposed change
### Data model (Supabase)
- Add soft delete fields: `archived_at` to `classes` and `pupils`.
- Add `pupil_accounts` (or extend `pupils`) to support username/password logins.
  - Suggested: store Supabase `auth.users` id on `pupils` as `auth_user_id` and optional `username`.
- Add indices and RLS policies so teachers only see their own classes/pupils.
- Optional RPCs for bulk operations (CSV import, phase rollover).

### Teacher Console UX
- Classes list:
  - Edit class name/phase.
  - Archive class (soft delete) with modal confirmation.
  - Hard delete class (permanent) with stronger confirmation.
- Pupils list:
  - Edit display name, needs, current mode.
  - Archive pupil (soft delete), delete permanently.
  - Reset password / regenerate login credentials.
- Bulk import:
  - Download CSV template.
  - Upload CSV → validate → preview → confirm.
- Phase rollover:
  - Per-class and bulk update (KS1 → LKS2 → UKS2).

### Auth support
- Google OAuth for teachers (already in place).
- Pupil logins:
  - Google OAuth (optional).
  - Username/password via Supabase Auth + `pupils.auth_user_id`.

## Files touched
- `apps/web/src/sections/teacher/ClassesPanel.tsx`
- `apps/web/src/store/useTeacherStore.ts` (remove/limit local persistence where replaced by Supabase)
- `apps/web/src/services/supabaseClient.ts`
- `apps/web/src/services/pupilImport.ts` (new CSV parser/validator)
- `apps/web/src/services/teacherApi.ts` (new Supabase CRUD wrapper)
- `apps/web/src/components/ConfirmDialog.tsx` (new reusable modal)
- Supabase SQL migrations (run in SQL editor)

## Risks / edge cases
- RLS policies must allow only owner access; bulk operations should avoid leaking data.
- Bulk import needs strict validation (empty names, duplicate usernames, invalid phases).
- Username/password accounts must avoid collisions and enforce strong password rules.
- Deleting classes should cascade/soft-delete pupils and assignments safely.
- Migration of existing local data to Supabase should be opt-in and reversible.

## How to test (manual)
- Create/edit/archive/delete classes and pupils; confirm archived items disappear.
- Bulk import with valid + invalid CSV; validate preview errors.
- Rollover classes individually and in bulk.
- Create pupil login (username/password) and confirm login works.
- Confirm teacher can only access their own data.

## Definition of done
- Teachers can manage classes/pupils (edit/archive/delete) with confirmations.
- Bulk CSV import works with preview + validation.
- Phase rollover works per class and in bulk.
- Pupil login supports Google OAuth or username/password.
- Data is fully stored in Supabase with RLS protection.
