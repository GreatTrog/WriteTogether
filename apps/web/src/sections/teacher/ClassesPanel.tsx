import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  archiveClass,
  createClass,
  deleteClass,
  fetchClassesWithPupils,
  updateClass,
  type TeacherClass,
} from "../../services/teacherData";

const classPhases = [
  { label: "KS1", value: "KS1" },
  { label: "LKS2", value: "LKS2" },
  { label: "UKS2", value: "UKS2" },
];

// Lightweight CRM for the pilot so teachers can trial roster flows.
const ClassesPanel = () => {
  const [className, setClassName] = useState("");
  const [phase, setPhase] = useState<"KS1" | "LKS2" | "UKS2">("LKS2");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const classData = await fetchClassesWithPupils();
      setClasses(classData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Quick helper for adding a showcase class with minimal validation.
  const handleCreateClass = async (event: FormEvent) => {
    event.preventDefault();
    if (!className.trim()) {
      return;
    }

    try {
      await createClass(className.trim(), phase);
      setClassName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create class.");
    }
  };

  const totalPupils = useMemo(
    () => classes.reduce((sum, group) => sum + group.pupils.length, 0),
    [classes],
  );

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
            <h2 className="text-lg font-semibold text-slate-900">Classes</h2>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Join codes update automatically
            </p>
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {classes.length} classes - {totalPupils} pupils
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading classes...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        ) : classes.length === 0 ? (
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
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={classGroup.name}
                      onChange={(event) =>
                        setClasses((current) =>
                          current.map((item) =>
                            item.id === classGroup.id
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      onBlur={async () => {
                        try {
                          setBusyId(classGroup.id);
                          await updateClass(classGroup.id, { name: classGroup.name });
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Unable to update class.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="text-lg font-semibold text-slate-900 outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <select
                        value={classGroup.phase}
                        onChange={async (event) => {
                          const nextPhase = event.target.value as typeof phase;
                          setClasses((current) =>
                            current.map((item) =>
                              item.id === classGroup.id
                                ? { ...item, phase: nextPhase }
                                : item,
                            ),
                          );
                          try {
                            setBusyId(classGroup.id);
                            await updateClass(classGroup.id, { phase: nextPhase });
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Unable to update class.",
                            );
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                      >
                        {classPhases.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span>- {classGroup.pupils.length} pupils</span>
                      {busyId === classGroup.id && (
                        <span className="text-slate-400">Saving...</span>
                      )}
                    </div>
                  </div>
                  <span className="ml-auto rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    Join code: {classGroup.join_code}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Archive ${classGroup.name}? Pupils will be archived too.`,
                          )
                        ) {
                          return;
                        }
                        try {
                          setBusyId(classGroup.id);
                          await archiveClass(classGroup.id);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Unable to archive class.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Delete ${classGroup.name}? This cannot be undone.`,
                          )
                        ) {
                          return;
                        }
                        try {
                          setBusyId(classGroup.id);
                          await deleteClass(classGroup.id);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Unable to delete class.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer font-semibold text-slate-600">
                    {classGroup.pupils.length} pupils assigned
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {classGroup.pupils.length === 0 ? (
                      <li className="text-slate-400">No pupils assigned.</li>
                    ) : (
                      classGroup.pupils.map((pupil) => (
                        <li key={pupil.id} className="text-slate-600">
                          {pupil.display_name}
                          {pupil.year_group ? ` (${pupil.year_group})` : ""}
                        </li>
                      ))
                    )}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ClassesPanel;
