# WriteTogether

Monorepo for the WriteTogether web application and supporting services. Phase 1 targets Colourful Semantics and Click-to-Compose modes, alongside the teacher console foundation.

## Packages
- `apps/web` – React + Vite pupil/teacher experience.
- `apps/server` – Express API server.
- `packages/ui` – Shared UI components.
- `packages/schema` – Zod schemas for shared types.
- `packages/analytics` – Analytics helpers and utilities.

## Getting Started
```bash
npm install
npm run dev --workspace @writetogether/server
npm run dev --workspace @writetogether/web
```

To build shared packages before running production builds:
```bash
npm run build --workspace @writetogether/schema
npm run build --workspace @writetogether/analytics
npm run build --workspace @writetogether/ui
```

## Project Docs
- `docs/phase1-foundation.md` – Phase 1 scope and technical plan.
- `docs/phase1-next-steps.md` – Follow-up actions towards a feature-complete MVP.

## Security Docs
- `docs/supabase-security-hardening.sql` - RLS hardening for pupil/teacher data tables.
- `docs/supabase-gdpr-controls.sql` - Retention and audit controls for GDPR operations.
- `docs/supabase-rollout-runbook.md` - SQL apply order, verification checks, and rollback guidance.

## Security Environment Variables
- Server:
  - `REQUIRE_HTTPS` (`true`/`false`): defaults to `true` in production, enforcing HTTPS-only API access.
  - `PUPIL_PASSWORD_KEY` (legacy single key, 32-byte base64 or hex).
  - `PUPIL_PASSWORD_KEYS` (recommended keyring): comma-separated `keyId:keyMaterial` entries.
  - `PUPIL_PASSWORD_KEY_ID` (recommended): active key ID used for new password encryption.

Example keyring:
```bash
PUPIL_PASSWORD_KEYS="2026q1:BASE64_KEY_A,2026q2:BASE64_KEY_B"
PUPIL_PASSWORD_KEY_ID="2026q2"
```
