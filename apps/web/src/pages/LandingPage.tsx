import { Link } from "react-router-dom";

// Overview cards give stakeholders a quick tour of the MVP scope.
const LandingPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">
        WriteTogether Phase 1 MVP
      </h1>
      <p className="text-slate-600">
        This workspace will grow into the progressive writing experience for
        pupils and the management console for teachers. Use the navigation to
        explore the early scaffolding for pupil modes and teacher workflows.
      </p>
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/pupil"
          className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          <div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Pupil workspace
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Pupil Experience</h2>
            <p className="mt-2 text-sm text-slate-600">
              Explore Mode 1 (Colourful Semantics) and Mode 2 (Click-to-Compose) scaffolds designed for KS1&ndash;LKS2 learners.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center text-sm font-semibold text-slate-700 transition group-hover:text-slate-900">
            Go to pupil workspace
            <svg className="ml-2 h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.5L10 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
        <Link
          to="/teacher"
          className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          <div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Teacher console
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Teacher Console</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage classes, assignments, word banks, and review analytics to support evidence-informed teaching.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center text-sm font-semibold text-slate-700 transition group-hover:text-slate-900">
            Enter teacher console
            <svg className="ml-2 h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.5L10 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </section>
    </div>
  );
};

export default LandingPage;




