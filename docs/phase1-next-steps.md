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
   Classes, pupils, assignments, word banks, analytics, and shared files now load from Supabase. Added subject links (per-teacher + admin global), assignment switching in Mode 1/2, mixed-bank support, and pupil read policies for assigned banks. New SQL docs: `docs/supabase-topics.sql`, `docs/supabase-topics-migration.sql`, `docs/supabase-pupil-word-bank-policies.sql`. Remaining: QA all panels end-to-end and verify export/share flows under offline conditions.

3. **Bulk pupil upload + deletion (teacher/admin)**  
   Add CSV import/export, bulk delete/archive, and guardrails for irreversible actions.

4. **LLM word bank generation (teacher accounts)**  
   Integrate an LLM API to generate word banks using the app schema with safety checks and prompts.

5. **Word bank expansion + navigation improvements**  
   Expand catalog coverage and continue improving the custom word bank flow (merge legacy split banks, subject link hygiene, and topic/subject management).

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
