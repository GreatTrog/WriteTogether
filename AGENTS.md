# WriteTogether - Agent Guide

## What WriteTogether is
WriteTogether is a Phase 1 MVP for pupil writing support and a teacher console. It delivers two pupil modes (Colourful Semantics and Click-to-Compose) plus a teacher workspace for classes, assignments, word banks, and analytics stubs.
Working backlog lives in TASKS.md.
When asked to plan a TASKS.md priority, use the structure in `plans/_template.md`.

## Current architecture (as implemented today)
```
Browser (React + Vite)
  |-- Pupil modes (Mode 1, Mode 2)
  |-- Teacher console (client-only)
  |-- Local persistence (localStorage via Zustand + manual keys)
  |-- Word bank catalog (static text files parsed at build time)
  |
  +-- Optional API (Express, stub endpoints)
```

The web app does not currently call the API. All data is in memory or localStorage.

## Stack and tooling
- Front-end: React 18, Vite, TypeScript, Tailwind CSS, clsx
- State: Zustand (persist middleware)
- Rich text: TipTap
- TTS: Web Speech API (browser)
- Audio recording: MediaRecorder API
- PDF export: pdfmake + html-to-pdfmake
- Back-end: Express (stubbed, no DB)
- Workspace: npm workspaces, ESLint

## Folder guide (where to change X)
- `apps/web` - Main UI
  - `src/pages` - Route-level pages (`LandingPage`, `PupilWorkspace`, `TeacherConsole`)
  - `src/sections/mode-one` - Colourful Semantics UI + logic
  - `src/sections/mode-two` - Click-to-Compose UI + logic
  - `src/sections/teacher` - Teacher console panels
  - `src/store` - Zustand stores
  - `src/services` - Word bank catalog parsing
  - `src/components` - Shared components and global menu
  - `src/wordbanks` - Raw word bank text files (catalog)
- `apps/server` - Express API placeholders
- `packages/schema` - Shared Zod schemas and types
- `packages/analytics` - Analytics helpers
- `packages/ui` - Shared UI bits
- `docs` - Plans and schema docs

## Key flows (what works now)
- Onboarding: Landing page -> choose Pupil or Teacher
- Pupil Mode 1: drag chips, toggle slots, read aloud, localStorage autosave
- Pupil Mode 2: draft with TipTap, insert tokens, localStorage autosave, export to PDF
- Teacher Console: manage classes, assignments, word banks, analytics stub, shared files list
- Word banks: parsed from `apps/web/src/wordbanks/**/*.txt` at build time
- Text-to-speech: `useSpeechSynthesis` in both modes
- Audio: `useVoiceRecorder` and `VoiceRecorderControls`

## Key conventions
- Routing: React Router in `apps/web/src/App.tsx`
- Styling: mostly Tailwind; Mode 1 and Mode 2 also rely on `ModeOneBuilder.css` and `ModeTwoWorkspace.css`
- State:
  - Teacher data in `useTeacherStore` (persisted)
  - Workspace theme in `useWorkspaceSettings` (persisted)
  - Mode 1 and Mode 2 have their own local state + localStorage keys
- Word banks:
  - Catalog parsed in `apps/web/src/services/wordBankCatalog.ts`
  - Teacher-created banks stored in `useTeacherStore`

## Running locally
```bash
npm install
npm run dev --workspace @writetogether/server
npm run dev --workspace @writetogether/web
```
Alternative (runs all workspaces):
```bash
npm run dev
```

Build and preview:
```bash
npm run build --workspace @writetogether/web
npm run preview --workspace @writetogether/web
```

## Environment variables
- Server (`apps/server`):
  - `PORT` (default 4000)
  - `CORS_ORIGIN` (comma-separated list, default `http://localhost:5173`)
- Web: none required

## Data and storage model
LocalStorage keys currently in use:
- `writetogether-mode1` (Mode 1 slot state + punctuation)
- `writetogether-mode2-draft` (Mode 2 HTML draft)
- `writetogether-current-username` (Mode 2 author label)
- `writetogether-teacher-store` (Zustand persisted teacher data)
- `writetogether-workspace-theme` (Theme)

Word banks:
- Files live in `apps/web/src/wordbanks/**/*.txt`
- Parsed at startup by `apps/web/src/services/wordBankCatalog.ts`
- Format documented in `docs/writetogether-word-bank-schema.md`

## Teacher-only features (current behavior)
- Teacher console routes are not authenticated or protected.
- All data is client-side and persisted in localStorage.
- No role enforcement exists in the server.

## Common pitfalls / gotchas
- PDF export uses `showSaveFilePicker`, which only works in Chromium-based browsers.
- BrowserRouter requires special handling for static hosting (refresh can 404).
- Large PDF exports are stored in localStorage as base64, which can exceed quotas.
- `docs/` and `README.md` include future plans that are not yet implemented.

## First 60 minutes checklist
- Run web + server locally and verify landing page loads.
- Open Pupil Mode 1 and Mode 2, test autosave and TTS.
- Open Teacher Console, create a class and assignment.
- Confirm word bank catalog loads in Word Banks panel.
- Try a PDF export in Mode 2 and confirm it appears in Shared Files.
- Note any console errors or broken routes.

## How to add a feature safely
1. Identify the route or section owner (pages vs sections).
2. Decide where state should live (local component vs Zustand).
3. Update types in `packages/schema` if the model changes.
4. Add UI wiring in `apps/web/src/sections` or `apps/web/src/pages`.
5. Handle persistence (localStorage keys or store changes) carefully.
6. Add error handling and a loading state if the flow uses async work.
7. Test the flow end-to-end in the browser.
