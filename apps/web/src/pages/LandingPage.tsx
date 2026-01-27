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
      <section className="grid gap-4 md:grid-cols-3">
        <Link
          to="/pupil/mode-one"
          className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            Mode 1: Colourful Semantics
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sentence-building scaffolds that guide pupils through who, what,
            where, and how details.
          </p>
        </Link>
        <Link
          to="/pupil/mode-two"
          className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            Mode 2: Click-to-Compose
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Mix and match prompts to build sentences quickly with structured
            choices.
          </p>
        </Link>
        <Link
          to="/teacher"
          className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            Teacher Console
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage classes, assignments, word banks, and review analytics to
            support evidence-informed teaching.
          </p>
        </Link>
      </section>
    </div>
  );
};

export default LandingPage;
