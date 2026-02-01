import { Link, Route, Routes } from "react-router-dom";
import ModeOneBuilder from "../sections/mode-one/ModeOneBuilder";
import ModeTwoWorkspace from "../sections/mode-two/ModeTwoWorkspace";
import PupilLoginPanel from "../sections/pupil/PupilLoginPanel";
import useSupabaseSession from "../hooks/useSupabaseSession";
import { supabase } from "../services/supabaseClient";

const PupilWorkspace = () => {
  const { session, user, loading } = useSupabaseSession();
  const role = user?.user_metadata?.role;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Loading pupil session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-600">
        <PupilLoginPanel />
      </div>
    );
  }

  if (role && role !== "pupil" && role !== "admin" && role !== "teacher") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-600">
        <p className="text-sm text-slate-600">
          This area is for pupil accounts. Please sign in with a pupil login.
        </p>
        {supabase ? (
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-4 inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        ) : null}
      </div>
    );
  }

  // Presents either scaffold depending on the selected mode path.
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex overflow-hidden rounded-2xl">
        <Routes>
          <Route
            index
            element={
              <div className="flex h-full w-full flex-col gap-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-600">
                <div className="max-w-2xl space-y-2 self-center">
                  <h2 className="text-2xl font-semibold text-slate-900">Choose your writing mode</h2>
                  <p className="text-sm text-slate-600">
                    Pick the scaffold that fits your task today. You can switch modes at any time.
                  </p>
                </div>
                <div className="grid w-full max-w-3xl gap-6 self-center md:grid-cols-2">
                  <Link
                    to="/pupil/mode-one"
                    className="group flex h-full flex-col justify-between rounded-2xl border border-orange-200 bg-white p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
                  >
                    <div>
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                        Mode 1
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-orange-900">
                        Colourful Semantics
                      </h3>
                      <p className="mt-2 text-sm text-orange-800">
                        Build sentences step-by-step with colour cues and sentence starters to guide
                        your ideas.
                      </p>
                    </div>
                    <span className="mt-6 inline-flex items-center text-sm font-semibold text-orange-700 transition group-hover:text-orange-800">
                      Start Mode 1
                      <svg
                        className="ml-2 h-4 w-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5.5 3.5L10 8l-4.5 4.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                  <Link
                    to="/pupil/mode-two"
                    className="group flex h-full flex-col justify-between rounded-2xl border border-sky-200 bg-white p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  >
                    <div>
                      <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-600">
                        Mode 2
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-sky-900">
                        Click-to-Compose
                      </h3>
                      <p className="mt-2 text-sm text-sky-800">
                        Craft paragraphs by selecting words and phrases, with live previews and
                        export tools.
                      </p>
                    </div>
                    <span className="mt-6 inline-flex items-center text-sm font-semibold text-sky-700 transition group-hover:text-sky-800">
                      Start Mode 2
                      <svg
                        className="ml-2 h-4 w-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5.5 3.5L10 8l-4.5 4.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                </div>
              </div>
            }
          />
          <Route path="mode-one" element={<ModeOneBuilder />} />
          <Route path="mode-two" element={<ModeTwoWorkspace />} />
        </Routes>
      </div>
    </div>
  );
};

export default PupilWorkspace;
