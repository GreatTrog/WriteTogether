# Phase 1 - Next Steps

This roadmap reflects the current client-only implementation (localStorage + build-time word banks)
and focuses only on incomplete work. Items are ordered by recommended delivery sequence.

## Locked decisions
- **Backend + auth + file storage:** Supabase (Postgres + Supabase Auth + Supabase Storage).
- **Hosting:** Vercel.

## Recommended next steps (in order)
1. **Supabase project setup + schema**  
   Create the Supabase project, define tables for classes, assignments, word banks, shared files, and pupils, and set up RLS policies.

2. **Supabase Auth integration**  
   Implement teacher authentication (SSO + fallback) and gate teacher console routes.

3. **Supabase Storage for exports**  
   Store exported files in Supabase Storage with signed URLs and metadata records in Postgres.

4. **Wire teacher console to Supabase**  
   Replace client-only actions with Supabase queries/mutations and error handling for classes, assignments, and word banks.

5. **Decide whether to keep client-side PDF export**  
   If server export is still required, implement DOCX/PDF generation and store outputs in Supabase Storage.

6. **Enhance Mode 1 content workflow**  
   Add picture cues and slot-specific banks sourced from teacher-configured word banks.

7. **Persist TTS preferences per pupil**  
   Store voice, rate, and pitch in pupil profiles and sync across modes.

8. **Accessibility audit and fixes**  
   Validate keyboard alternatives, focus order, and ARIA labels (especially drag/drop).

9. **Expand analytics pipeline**  
   Capture autosave revisions, TTS plays, and word growth per session.
