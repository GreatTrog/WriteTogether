import { Link, useLocation, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import clsx from "clsx";
import { pupilModes } from "../constants/pupilModes";
import logoWideUrl from "../assets/logo_wide.svg";

const navItems = [
  { label: "Overview", to: "/" },
  { label: "Pupil Workspace", to: "/pupil" },
  { label: "Teacher Console", to: "/teacher" },
];

const ShellLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const navigate = useNavigate();

  const showPupilSelector = location.pathname.startsWith("/pupil");
  const normalisedPath = location.pathname.replace(/\/$/, "");
  const currentPupilMode =
    pupilModes
      .slice()
      .sort((a, b) => b.path.length - a.path.length)
      .find((mode) =>
        mode.path === "/pupil"
          ? normalisedPath === "/pupil"
          : normalisedPath.startsWith(mode.path),
      ) ?? pupilModes[0];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link
            to="/"
            className="flex items-center"
            aria-label="Go to homepage"
          >
            <img
              src={logoWideUrl}
              alt="WordWise"
              className="h-16 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  "rounded-md px-3 py-2 transition-colors hover:bg-slate-100",
                  location.pathname.startsWith(item.to)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700",
                )}
              >
                {item.label}
              </Link>
            ))}
            {showPupilSelector && (
              <select
                value={currentPupilMode.path}
                onChange={(event) => navigate(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                aria-label="Switch pupil workspace mode"
              >
                {pupilModes.map((mode) => (
                  <option key={mode.path} value={mode.path}>
                    {mode.label}
                  </option>
                ))}
              </select>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-1 flex-col overflow-hidden px-6 py-6">
        {children}
      </main>
    </div>
  );
};

export default ShellLayout;
