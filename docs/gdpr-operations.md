# WriteTogether GDPR Operations (Children/SEND)

This file is an implementation checklist, not legal advice.
Use it with your DPO/legal counsel before production release.

## 1) Lawful Basis and Governance
- Record lawful basis for processing child data (typically `public task` for schools or `legitimate interests` with balancing test where applicable).
- Document controller/processor roles between school, vendor, and hosting providers.
- Keep Article 30 records of processing activities updated.
- Complete and store a DPIA before production use.

## 2) Data Minimisation
- Use pseudonymous pupil display names where possible.
- Do not collect unnecessary special-category data in free-text fields.
- Restrict teacher-entered support notes to educationally necessary content only.

## 3) Access Control and Least Privilege
- Apply `docs/supabase-security-hardening.sql`.
- Keep RLS enabled on all child-data tables.
- Limit service-role key usage to server-side only.
- Rotate API keys/secrets on a fixed schedule and after incidents.

## 4) Credential Handling for Young Pupils
- Teacher-managed passwords are allowed by design.
- Never expose credentials outside trusted teacher/admin views.
- Require staff safeguarding policy coverage for credential handling.
- Use password reset workflows instead of ad-hoc password sharing channels.

## 5) Retention and Deletion
- Apply `docs/supabase-gdpr-controls.sql`.
- Confirm retention windows with school policy:
  - Drafts
  - Exports/shared files
  - Archived pupil profiles
- Run purge jobs on schedule and keep evidence of execution.

## 6) Data Subject Rights (SAR/Erasure)
- Maintain a documented process for:
  - Access requests
  - Rectification
  - Erasure/restriction
  - Objection handling where relevant
- Ensure exports can be generated per pupil on request.
- Ensure erasure removes profile, drafts, and files per policy.

## 7) Security Controls
- Enforce HTTPS in production (`REQUIRE_HTTPS=true`).
- Keep HSTS enabled via `helmet`.
- Enable audit logging for inserts/updates/deletes on child-data tables.
- Review access logs and audit events regularly.

## 8) Incident Response
- Define breach triage and notification timeline (72-hour window where applicable).
- Keep runbooks for key compromise, unauthorized access, and accidental disclosure.
- Test backup/restore and post-incident key rotation procedures.

