import { FormEvent, useState } from "react";

import { useTeacherStore } from "../../store/useTeacherStore";

const classPhases = [
  { label: "KS1", value: "KS1" },
  { label: "LKS2", value: "LKS2" },
  { label: "UKS2", value: "UKS2" },
];

const ClassesPanel = () => {
  const { classes, createClass, addPupil } = useTeacherStore();

  const [className, setClassName] = useState("");
  const [phase, setPhase] = useState<"KS1" | "LKS2" | "UKS2">("LKS2");
  const [pupilName, setPupilName] = useState("");
  const [support, setSupport] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const handleCreateClass = (event: FormEvent) => {
    event.preventDefault();
    if (!className.trim()) {
      return;
    }

    createClass(className.trim(), phase);
    setClassName("");
  };

  const handleAddPupil = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClass || !pupilName.trim()) {
      return;
    }

    addPupil(
      selectedClass,
      pupilName.trim(),
      support ? [support.trim()] : [],
    );
    setPupilName("");
    setSupport("");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create a class</h2>
        <form
          onSubmit={handleCreateClass}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label className="grow text-sm font-medium text-slate-600">
            Class name
            <input
              type="text"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="e.g. Y4 Polar Explorers"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Phase
            <select
              value={phase}
              onChange={(event) =>
                setPhase(event.target.value as typeof phase)
              }
              className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              {classPhases.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Add class
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Class overview
            </h2>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Join codes update automatically
            </p>
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {classes.length} classes
          </div>
        </div>

        {classes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Create your first class using the form above.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {classes.map((classGroup) => (
              <div
                key={classGroup.id}
                className="rounded-md border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {classGroup.name}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {classGroup.phase} - {classGroup.pupils.length} pupils
                    </p>
                  </div>
                  <span className="ml-auto rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    Join code: {classGroup.joinCode}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pupil profiles
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {classGroup.pupils.length === 0 ? (
                        <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">
                          No pupils yet - add from the form.
                        </li>
                      ) : (
                        classGroup.pupils.map((pupil) => (
                          <li
                            key={pupil.id}
                            className="rounded-md bg-slate-50 px-3 py-2"
                          >
                            <p className="font-medium text-slate-800">
                              {pupil.displayName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Mode:{" "}
                              {pupil.currentMode === "mode1"
                                ? "Colourful Semantics"
                                : "Click-to-Compose"}
                            </p>
                            {pupil.needs.length > 0 && (
                              <p className="text-xs text-slate-500">
                                Support: {pupil.needs.join(", ")}
                              </p>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <form
                    onSubmit={handleAddPupil}
                    className="rounded-md bg-slate-50 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quick add pupil
                    </p>
                    <label className="mt-2 block text-xs font-medium text-slate-600">
                      Class
                      <select
                        value={selectedClass ?? ""}
                        onChange={(event) =>
                          setSelectedClass(event.target.value || null)
                        }
                        required
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                      >
                        <option value="">Choose class</option>
                        {classes.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-2 block text-xs font-medium text-slate-600">
                      Pupil name (pseudonym)
                      <input
                        type="text"
                        value={pupilName}
                        onChange={(event) => setPupilName(event.target.value)}
                        placeholder="e.g. Pupil D"
                        required
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                      />
                    </label>
                    <label className="mt-2 block text-xs font-medium text-slate-600">
                      Support focus (optional)
                      <input
                        type="text"
                        value={support}
                        onChange={(event) => setSupport(event.target.value)}
                        placeholder="e.g. fronted adverbials"
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                      />
                    </label>
                    <button
                      type="submit"
                      className="mt-3 w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      Add pupil
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ClassesPanel;



