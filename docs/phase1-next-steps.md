## Phase 1 — Next Steps Checklist

- [ ] Replace stub export endpoint with real DOCX/PDF generation (e.g., `docx` + `pdfkit`) and secure download URLs.
- [ ] Implement persistence layer (Prisma ORM) and migrate from in-memory store to database-backed classes, assignments, and word banks.
- [ ] Hook teacher console actions to API (`/classes`, `/assignments`, `/word-banks`) with optimistic updates and error handling.
- [ ] Add authentication shell (MS/Google SSO + class password fallback) and protect teacher routes.
- [ ] Build real Colourful Semantics drag-and-drop with picture cues and slot-specific banks sourced from teacher console.
- [ ] Integrate TTS voice settings into pupil profiles (speed, pitch) and sync across modes.
- [ ] Begin accessibility audit (focus order, ARIA labels, keyboard drag alternative).
- [ ] Expand analytics pipeline to capture autosave revisions, TTS plays, and word growth per session.
