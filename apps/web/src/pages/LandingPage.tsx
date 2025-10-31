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
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Pupil Experience
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Explore Mode 1 (Colourful Semantics) and Mode 2 (Click-to-Compose)
            scaffolds designed for KS1&ndash;LKS2 learners.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Teacher Console
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage classes, assignments, word banks, and review analytics to
            support evidence-informed teaching.
          </p>
        </article>
      </section>
    </div>
  );
};

export default LandingPage;
