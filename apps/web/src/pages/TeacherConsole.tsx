import { NavLink, Route, Routes } from "react-router-dom";
import { useState } from "react";
import ClassesPanel from "../sections/teacher/ClassesPanel";
import WordBanksPanel from "../sections/teacher/WordBanksPanel";
import AssignmentsPanel from "../sections/teacher/AssignmentsPanel";
import AnalyticsPanel from "../sections/teacher/AnalyticsPanel";
import SharedFilesPanel from "../sections/teacher/SharedFilesPanel";
import PupilsPanel from "../sections/teacher/PupilsPanel";
import useSupabaseSession from "../hooks/useSupabaseSession";
import { requireSupabase, supabase } from "../services/supabaseClient";

// Secondary nav mirrors the teacher workflow areas surfaced in Phase 1.
const sections = [
  { path: "", label: "Dashboard" },
  { path: "classes", label: "Classes" },
  { path: "pupils", label: "Pupils" },
  { path: "assignments", label: "Assignments" },
  { path: "banks", label: "Word Banks" },
  { path: "shared-files", label: "Shared Files" },
  { path: "analytics", label: "Analytics" },
];

const TeacherConsole = () => {
  const { session, user, loading } = useSupabaseSession();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!supabase) {
      setAuthError("Supabase is not configured yet.");
      return;
    }
    setAuthError(null);
    const client = requireSupabase();
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/teacher`,
      },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setAuthError(null);
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Loading teacher session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Console</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with Google to access classes, assignments, and shared files.
          </p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign in with Google
            </button>
            {authError ? (
              <p className="text-sm text-rose-600">{authError}</p>
            ) : null}
            {!supabase ? (
              <p className="text-xs text-slate-500">
                Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Teacher Console (Preview)
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as {user?.email ?? "teacher"}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Manage classes, scaffold content, and monitor impact. Features below
          will be built out during Phase 1.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <NavLink
            key={section.path}
            to={section.path}
            end={section.path === ""}
            className={({ isActive }) =>
              [
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
              ].join(" ")
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Swap the focused management view while keeping the surrounding context. */}
        <Routes>
          <Route
            index
            element={
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  The teacher console brings together class management, word
                  banks, assignments, and analytics. Each section below is being
                  scaffolded to support quick setup during pilot.
                </p>
                <p>
                  AI-powered bank generators and template tools will sit behind
                  teacher authentication, maintaining safeguarding boundaries.
                </p>
              </div>
            }
          />
          <Route path="classes" element={<ClassesPanel />} />
          <Route path="pupils" element={<PupilsPanel />} />
          <Route path="assignments" element={<AssignmentsPanel />} />
          <Route path="banks" element={<WordBanksPanel />} />
          <Route path="shared-files" element={<SharedFilesPanel />} />
          <Route path="analytics" element={<AnalyticsPanel />} />
        </Routes>
      </section>
    </div>
  );
};

export default TeacherConsole;
