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
