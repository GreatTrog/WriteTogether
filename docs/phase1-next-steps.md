# Phase 1 - Next Steps

This roadmap reflects the current hybrid implementation (Supabase auth/storage + local fallbacks)
and focuses only on incomplete work. Items are ordered by recommended delivery sequence.

## Locked decisions
- **Backend + auth + file storage:** Supabase (Postgres + Supabase Auth + Supabase Storage).
- **Hosting:** Vercel.

## Recommended next steps (in order)
1. **Admin superuser + invite gating (mostly complete)**  
   Admin role, invite workflow, and admin console are implemented. Remaining: finalize RLS hardening across all tables and verify admin visibility of all datasets.

2. **Finish wiring teacher console to Supabase (in progress)**  
   Classes, pupils, assignments, word banks, analytics, and shared files now load from Supabase. Added subject links (per-teacher + admin global), assignment switching in Mode 1/2, mixed-bank support, and pupil read policies for assigned banks. New SQL docs: `docs/supabase-topics.sql`, `docs/supabase-topics-migration.sql`, `docs/supabase-pupil-word-bank-policies.sql`. Remaining: QA all panels end-to-end, verify export/share flows under offline conditions, and confirm new AI flow works reliably in production.

3. **Bulk pupil upload + deletion (teacher/admin)**  
   Add CSV import/export, bulk delete/archive, and guardrails for irreversible actions.

4. **LLM word bank generation (mostly complete)**  
   Gemini API integration is wired server-side with schema validation + retry prompts, and the teacher UI can generate drafts into the custom bank builder. Remaining: add rate-limit/backoff handling, surface model selection if needed, and QA output quality for Mode 1/Mode 2.

5. **Word bank expansion + navigation improvements**  
   Expand catalog coverage and continue improving the custom word bank flow (subject link hygiene, topic/subject management, and QA of mixed-bank UX).

6. **Decide whether to keep client-side PDF export**  
   If server export is still required, implement DOCX/PDF generation and store outputs in Supabase Storage.

7. **Enhance Mode 1 content workflow**  
   Add picture cues and slot-specific banks sourced from teacher-configured word banks.

8. **Persist TTS preferences per pupil**  
   Store voice, rate, and pitch in pupil profiles and sync across modes.

9. **Accessibility audit and fixes**  
   Validate keyboard alternatives, focus order, and ARIA labels (especially drag/drop).

10. **Expand analytics pipeline**  
    Capture autosave revisions, TTS plays, and word growth per session.
