# WriteTogether – Task List (from code review) 

Last updated: 2026-01-28

How to use:
- Tick items off as they are completed.
- If a task grows, add a short plan in /plans and link it.
- Keep this file the single source of truth for this backlog.

Legend:
- P0 = urgent/blocking
- P1 = important (next)
- P2 = valuable tidy-up / resilience
- Quick wins = should be < 1 hour

---

## P0
- [ ] None identified

---

## P1 (next)

- [x] **Add PDF export fallback** when `showSaveFilePicker` is unavailable  
  Files: `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx`  
  Plan: `plans/P1-pdf-export-fallback.md`

- [x] **Stop storing PDF blobs in localStorage**; use IndexedDB or metadata-only  
  Files: `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx`, `apps/web/src/stores/useTeacherStore.ts`  
  Plan: `plans/P1-stop-storing-pdf-blobs.md`

- [x] **Reduce bundle cost from wordbank parsing** (precompile or lazy-load)  
  Files: `apps/web/src/wordbanks/wordBankCatalog.ts`  
  Plan: `plans/P1-wordbank-bundle-cost.md`

---

## P2

- [x] **Remove/clean stray files and duplicate type shims**  
  Targets:  
  - `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx.bak`  
  - `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx.txt`  
  - duplicate `html-to-pdfmake.d.ts`  
  Notes: keep the preferred shim in `apps/web/src/types`

- [x] **Align naming/branding and fix docs encoding**  
  Files: `apps/web/src/components/ShellLayout.tsx`, `README.md`, `docs/phase1-next-steps.md`

- [x] **Add an error boundary for resilience**  
  File: `apps/web/src/App.tsx`

---

## Quick wins (under 1 hour)

- [x] Delete `ModeTwoWorkspace.tsx.bak` and `ModeTwoWorkspace.tsx.txt`  
  Path: `apps/web/src/sections/mode-two/`

- [x] Keep only one `html-to-pdfmake.d.ts`  
  Prefer: `apps/web/src/types/html-to-pdfmake.d.ts`  
  Remove the duplicate elsewhere.

- [x] Fix alt text: change "WordWise" -> "WriteTogether"  
  File: `apps/web/src/components/ShellLayout.tsx`

- [x] Fix mojibake in docs by re-saving as UTF-8  
  Files: `README.md`, `docs/phase1-next-steps.md`, `docs/writetogether-word-bank-schema.md`

- [ ] Add `try/catch` around `localStorage` reads/writes  
  Files: `apps/web/src/sections/mode-one/ModeOneBuilder.tsx`, `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx`

---

## Later improvements (parking lot)

- [ ] Break Mode Two into smaller components (editor, banks, export, toolbar)  
  File: `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx`

- [ ] Add API wiring with real persistence and teacher auth  
  Files: `apps/server/src/*`, `apps/web/src/sections/teacher/*`

- [ ] Add a consistent UI kit and form validation pattern  
  Files: `apps/web/src/components`, `apps/web/src/sections/teacher/*`

- [ ] Introduce tests (Vitest + Playwright) for core flows
