import { Link } from "react-router-dom";
import logoSquare from "../assets/logo_square.png";

// Overview cards give stakeholders a quick tour of the MVP scope.
const LandingPage = () => {
  return (
    <div className="space-y-10">
      <section
        className="wt-splash relative overflow-hidden rounded-3xl px-6 py-12 shadow-sm"
      >
        <div className="grid justify-items-center gap-10 text-center lg:grid-cols-[220px_1fr] lg:items-center lg:text-left">
          <div className="wt-splash-card mx-auto flex w-full max-w-[220px] justify-center rounded-2xl p-4">
            <img src={logoSquare} alt="WriteTogether logo" className="h-40 w-40" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold text-[color:var(--app-text-primary)] sm:text-4xl">
              Welcome to WriteTogether!
            </h1>
            <div className="space-y-3 text-base text-[color:var(--app-text-muted)]">
              <p>WriteTogether is a special writing tool for the classroom.</p>
              <p>
                You can write, record your voice, and hear what you’ve written out loud.
              </p>
              <p>Let’s write together and have fun!</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                to="/pupil"
                className="wt-button-primary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Login
              </Link>
              <Link
                to="/learn-more"
                className="wt-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
