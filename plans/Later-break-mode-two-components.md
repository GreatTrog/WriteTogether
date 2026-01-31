# Break Mode Two into smaller components

## Goal
Split `ModeTwoWorkspace` into focused components (editor, banks, export, toolbar) while keeping behaviour identical and reducing file size/complexity.

## Current behaviour
- `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx` owns all UI, editor setup, export logic, word bank shaping, and render functions.
- Toolbar, editor canvas, export buttons/toast, bank tabs, alphabetical view, and settings menu are all inline JSX.
- Helper utilities (category mapping, PDF helpers, word bank reshaping) live in the same file.

## Proposed change
- Keep `ModeTwoWorkspace` as the orchestration container; move rendering and isolated logic into components/hooks without changing behaviour.
- Extract UI components:
  - `ModeTwoToolbar` (font select + text marks + list buttons + recorder controls).
  - `ModeTwoEditorSurface` (editor content + export toast + action bar for speak/clear/export).
  - `ModeTwoBankPanel` (class-based bank cards) and `ModeTwoAlphabeticalPanel`.
  - `ModeTwoAlphaStrip` (alphabet letter selector for alphabetical mode).
  - `ModeTwoSettingsMenu` (topic filter, sort toggle, voice picker, autosave note).
- Extract utilities/hooks:
  - `modeTwoBankUtils.ts` for category/heading normalization + grouping logic.
  - `useModeTwoExport` hook for export flow (PDF generation + shared file storage + toast state).
  - Optional: `useModeTwoEditor` hook to centralize editor setup, draft persistence, and voice handling.
- Keep CSS class names unchanged to avoid UI regressions.
- Ensure global menu wiring stays in the container (still uses `useGlobalMenu`).

## Files touched
- `apps/web/src/sections/mode-two/ModeTwoWorkspace.tsx`
- `apps/web/src/sections/mode-two/ModeTwoToolbar.tsx`
- `apps/web/src/sections/mode-two/ModeTwoEditorSurface.tsx`
- `apps/web/src/sections/mode-two/ModeTwoBankPanel.tsx`
- `apps/web/src/sections/mode-two/ModeTwoAlphabeticalPanel.tsx`
- `apps/web/src/sections/mode-two/ModeTwoAlphaStrip.tsx`
- `apps/web/src/sections/mode-two/ModeTwoSettingsMenu.tsx`
- `apps/web/src/sections/mode-two/modeTwoBankUtils.ts`
- `apps/web/src/sections/mode-two/useModeTwoExport.ts`
- (Optional) `apps/web/src/sections/mode-two/useModeTwoEditor.ts`

## Risks / edge cases
- `useEditor` instance ownership: ensure only one editor instance; avoid re-creating on rerenders.
- Export flow focus management: keep refocus timing identical when export completes.
- Voice selection: preserve preferred voice selection + manual override logic.
- Alphabetical mode: active letter selection should reset correctly when buckets change.
- CSS scoping: class names must remain identical; avoid moving styles or renaming classes.

## How to test (manual)
- Load Mode Two and verify editor renders with placeholder, font controls, and formatting buttons.
- Insert tokens from both class and alphabetical views; confirm insertion adds spacing.
- Read back selected text and full draft with TTS; voice selection persists.
- Clear draft and confirm editor resets and autosave updates.
- Export preview: check PDF download + shared file entry in teacher console.
- Switch topics and sort modes; confirm word banks and alphabetical strip update correctly.
- Refresh page and confirm draft persists.

## Definition of done
- `ModeTwoWorkspace.tsx` reduced to orchestration; UI split across new components.
- No functional regressions in editor, banks, export, or toolbar.
- Lint/build passes locally.
- TASKS.md updated with plan link.
