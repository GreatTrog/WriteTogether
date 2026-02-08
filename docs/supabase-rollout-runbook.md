# Supabase Rollout Runbook

Use this runbook when promoting Supabase schema/security changes from local work to staging/production.
Treat this as a release checklist and keep the completed copy with your deployment records.

## Change Record
- Change owner:
- Reviewer:
- Date:
- Environment: `staging` / `production`
- Related ticket/issue:
- App version/commit:
- Notes:

## 1) Apply SQL in order
Run in Supabase SQL Editor for **staging first**, then production.

1. [ ] `docs/supabase-topics-migration.sql` (or `docs/supabase-topics.sql` for fresh setup)
2. [ ] `docs/supabase-pupil-word-bank-policies.sql`
3. [ ] `docs/supabase-security-hardening.sql`
4. [ ] `docs/supabase-gdpr-controls.sql`

Execution log:
- SQL file:
- Executed by:
- Timestamp:
- Result: `pass` / `fail`
- Error snippet (if failed):

## 2) Post-apply fixes for security advisor warnings
Set function `search_path` safely for existing helper functions:

```sql
do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as fn_name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'is_admin',
        'is_teacher',
        'is_pupil',
        'current_teacher_profile_id',
        'current_pupil_id',
        'current_pupil_claim_id'
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, auth, pg_catalog',
      r.schema_name,
      r.fn_name,
      r.args
    );
  end loop;
end $$;
```

- [ ] Applied in target environment
- Applied by:
- Timestamp:

## 3) Validate core behavior
1. [ ] Teacher can create/update/delete own classes, pupils, assignments.
2. [ ] Teacher cannot access another teacher's rows.
3. [ ] Pupil can only access own class/assignment/drafts and assigned bank reads.
4. [ ] Admin can read across datasets where expected.
5. [ ] CSV import still creates pupils + logins; partial failures are reported.

Validation log:
- Tested by:
- Timestamp:
- Result: `pass` / `fail`
- Notes:

## 4) Verify security advisor output
Expected after applying scripts:
- [ ] RLS enabled for public child-data tables.
- [ ] Search path mutable warnings resolved for helper functions above.

Known limitation:
- Free plan may still show Auth warning for leaked-password protection because dashboard toggle is unavailable on that tier.

## 5) Environment and deployment checklist
- API enforces HTTPS in production (`REQUIRE_HTTPS=true` or production default).
- Password key settings present:
  - `PUPIL_PASSWORD_KEYS` (recommended keyring)
  - `PUPIL_PASSWORD_KEY_ID` (active key id)
  - optional fallback: `PUPIL_PASSWORD_KEY`
- [ ] Deploy server and web after SQL changes.

## 6) Rollback guidance
If a policy change blocks access unexpectedly:
1. Revert policy script from previous known-good migration.
2. Re-run affected policy section only.
3. Re-test with teacher, pupil, and admin accounts before reopening access.

## Staging Sign-off
- SQL applied: [ ] yes
- Functional validation passed: [ ] yes
- Security advisor checks reviewed: [ ] yes
- Approved by:
- Approval timestamp:
- Status: `approved` / `rejected`

## Production Sign-off
- SQL applied: [ ] yes
- Functional validation passed: [ ] yes
- Security advisor checks reviewed: [ ] yes
- Approved by:
- Approval timestamp:
- Status: `approved` / `rejected`
