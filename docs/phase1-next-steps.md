# Phase 1 - Next Steps

This roadmap reflects the current client-only implementation (localStorage + build-time word banks)
and focuses only on incomplete work. Items are ordered by recommended delivery sequence.

## Recommended next steps (in order)
1. **Decide data + auth architecture**  
   Confirm target deployment, storage model (server DB vs hosted backend), and auth approach (SSO + fallback).

2. **Implement persistence layer**  
   Introduce a real database (e.g., Prisma) for classes, assignments, word banks, and shared files.

3. **Add authentication and route protection**  
   Implement teacher auth and gate teacher console routes.

4. **Wire teacher console to the API**  
   Replace client-only actions with API calls and error handling for `/classes`, `/assignments`, `/word-banks`.

5. **Replace stub export endpoint (optional if keeping client-side export)**  
   If server export is required, implement DOCX/PDF generation + secure download URLs.

6. **Enhance Mode 1 content workflow**  
   Add picture cues and slot-specific banks sourced from teacher-configured word banks.

7. **Persist TTS preferences per pupil**  
   Store voice, rate, and pitch in pupil profiles and sync across modes.

8. **Accessibility audit and fixes**  
   Validate keyboard alternatives, focus order, and ARIA labels (especially drag/drop).

9. **Expand analytics pipeline**  
   Capture autosave revisions, TTS plays, and word growth per session.
