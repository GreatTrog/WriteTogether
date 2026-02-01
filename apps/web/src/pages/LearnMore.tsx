import { Link } from "react-router-dom";
import logoSquare from "../assets/logo_square.png";

const LearnMore = () => {
  return (
    <div className="space-y-10">
      <section
        className="wt-splash relative overflow-hidden rounded-3xl px-6 py-10 shadow-sm"
      >
        <div className="grid justify-items-center gap-8 text-center lg:grid-cols-[180px_1fr] lg:items-center lg:text-left">
          <div className="wt-splash-card mx-auto flex w-full max-w-[180px] justify-center rounded-2xl p-4">
            <img src={logoSquare} alt="WriteTogether logo" className="h-32 w-32" />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--app-text-muted)]">
              Teacher guide
            </p>
            <h1 className="text-3xl font-extrabold text-[color:var(--app-text-primary)] sm:text-4xl">
              Help every learner find their voice in writing
            </h1>
            <p className="text-base text-[color:var(--app-text-muted)]">
              WriteTogether is a classroom writing tool designed to scaffold ideas, reduce
              cognitive load, and make composition feel achievable for all learners -
              especially pupils with SEND.
            </p>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                to="/pupil"
                className="wt-button-primary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Login
              </Link>
              <Link
                to="/teacher"
                className="wt-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Teacher Console
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
            Mode 1
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-orange-900">
            Colourful Semantics
          </h2>
          <p className="mt-3 text-sm text-orange-800">
            Pupils build sentences step-by-step using colour-coded prompts.
            The structure keeps language choices focused and helps pupils form complete,
            grammatically rich sentences before moving into paragraphs.
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Key benefits
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Reduces working memory load by breaking tasks into clear slots.</li>
                <li>Encourages full sentences with subject, verb, and object prompts.</li>
                <li>Supports vocabulary growth with visible word bank cues.</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                SEND support
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Visual scaffolds help pupils with language processing needs.</li>
                <li>Drag-and-drop interaction builds engagement and reduces fine motor strain.</li>
                <li>Consistent colour coding reinforces grammar structures.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
            Mode 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-sky-900">
            Click-to-Compose
          </h2>
          <p className="mt-3 text-sm text-sky-800">
            Pupils draft longer writing by selecting words, phrases, and sentences.
            The editor supports live composition, read-aloud playback, and export tools
            to make drafting feel safe and reversible.
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Key benefits
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Helps pupils plan and structure paragraphs before free typing.</li>
                <li>Encourages editing through undo/redo, lists, and clear formatting.</li>
                <li>Supports independent drafting with built-in word banks.</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                SEND support
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Text-to-speech reinforces comprehension and proofreading.</li>
                <li>Font size controls reduce visual stress.</li>
                <li>Autosave reduces anxiety around losing work.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Key features teachers rely on</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Teacher Console</h3>
            <p className="mt-2 text-sm text-slate-600">
              Manage classes, assignments, and word banks in one space. Track progress with
              shared files and analytics snapshots.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Word banks and prompts</h3>
            <p className="mt-2 text-sm text-slate-600">
              Provide vocabulary support by topic, year group, or grammar focus. Pupils can
              click to insert words without breaking flow.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Voice tools</h3>
            <p className="mt-2 text-sm text-slate-600">
              Built-in recording and playback help pupils rehearse writing, practise fluency,
              and self-correct.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Inclusive design</h3>
            <p className="mt-2 text-sm text-slate-600">
              Clear layout, colour cues, and predictable toolbars reduce distraction and support
              executive function needs.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-900 px-6 py-8 text-center text-white">
        <h2 className="text-2xl font-semibold">Ready to plan your next writing lesson?</h2>
        <p className="mt-2 text-sm text-slate-200">
          Log in to explore both modes, build word banks, and prepare assignments.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            to="/pupil"
            className="wt-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Login to WriteTogether
          </Link>
          <Link
            to="/teacher"
            className="wt-button-primary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Open Teacher Console
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LearnMore;
