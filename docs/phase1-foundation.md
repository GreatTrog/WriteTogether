# Phase 1 Foundation Plan

## Objectives
- Deliver Modes 1 and 2 with scaffolded writing workflows usable end-to-end.
- Provide minimal teacher console to manage classes, assignments, and word banks.
- Enable browser TTS playback, exports, autosave, and analytics stubs aligned with the Phase 1 brief.

## Technical Stack
- **Front-end:** Vite + React + TypeScript, Zustand for state management, Tailwind CSS for styling, TipTap for rich text areas.
- **Back-end:** Node.js + Express with TypeScript, Prisma ORM targeting SQLite (dev) and PostgreSQL (prod), Zod for schema validation.
- **Shared:** Turborepo-style workspace managed with npm workspaces, ESLint + Prettier + Vitest/Jest setup, Playwright for critical flows.

## High-Level Deliverables
1. **Web App (`apps/web`):**
   - Mode 1: Colourful Semantics builder with drag chips, slot toggles, read-aloud via Web Speech API.
   - Mode 2: Click-to-compose editor with token insertion, mini TTS, simple checks.
   - Shared layout, auth shell, autosave to local storage, export to DOCX/PDF via server API.
2. **Teacher Console (`apps/web`):**
   - Class and pupil lists, assignment creator, word bank manager, analytics dashboard (stubbed charts).
   - Feature toggles per assignment (mode lock, bank selection, TTS toggle).
3. **API Server (`apps/server`):**
   - Authentication endpoints (stub SSO), class/pupil CRUD, word bank CRUD, assignments, document storage.
   - Analytics aggregation endpoints (placeholder logic).
   - Export service endpoints (DOCX/PDF, using server-side generators).
4. **Tooling & Infrastructure:**
   - Shared UI kit (`packages/ui`), schema definitions (`packages/schema`), analytics helpers (`packages/analytics`).
   - Testing harnesses (unit + integration), CI-ready scripts, environment configuration.

## Initial Milestones
1. Scaffold repository structure, linting, formatting, testing pipelines.
2. Implement teacher authentication shell, class/assignment data flow, Mode 1 playable experience.
3. Add Mode 2 editor, word bank management, exports, analytics instrumentation.

## Open Questions
- Confirm deployment target (Vercel/Render/Azure) to align with environment variables and storage decisions.
- Decide on third-party DOCX/PDF generation libraries with offline capability.
- Validate speech synthesis coverage on target school devices.*** End Patch
