import { NavLink, Route, Routes } from "react-router-dom";
import ClassesPanel from "../sections/teacher/ClassesPanel";
import WordBanksPanel from "../sections/teacher/WordBanksPanel";
import AssignmentsPanel from "../sections/teacher/AssignmentsPanel";
import AnalyticsPanel from "../sections/teacher/AnalyticsPanel";

const sections = [
  { path: "", label: "Dashboard" },
  { path: "classes", label: "Classes & Pupils" },
  { path: "assignments", label: "Assignments" },
  { path: "banks", label: "Word Banks" },
  { path: "analytics", label: "Analytics" },
];

const TeacherConsole = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Teacher Console (Preview)
        </h1>
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
          <Route path="assignments" element={<AssignmentsPanel />} />
          <Route path="banks" element={<WordBanksPanel />} />
          <Route path="analytics" element={<AnalyticsPanel />} />
        </Routes>
      </section>
    </div>
  );
};

export default TeacherConsole;
