import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  archivePupil,
  createPupil,
  deletePupil,
  fetchClassesWithPupils,
  fetchPupils,
  updatePupil,
  updatePupilClass,
  type TeacherClass,
  type TeacherPupilRow,
} from "../../services/teacherData";
import {
  createPupilLogin,
  revealPupilPassword,
  resetPupilPassword,
} from "../../services/pupilAuthApi";

const yearGroups = ["Y1", "Y2", "Y3", "Y4", "Y5", "Y6"] as const;

const resolvePhaseFromYear = (year: string | null) => {
  if (!year) {
    return null;
  }
  if (year === "Y1" || year === "Y2") {
    return "KS1";
  }
  if (year === "Y3" || year === "Y4") {
    return "LKS2";
  }
  return "UKS2";
};

const toUsername = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.)|(\.$)/g, "")
    .slice(0, 24);

const generatePassword = () =>
  Math.random().toString(36).slice(2, 6) +
  Math.random().toString(36).slice(2, 6).toUpperCase();

const PupilsPanel = () => {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [pupils, setPupils] = useState<TeacherPupilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pupilName, setPupilName] = useState("");
  const [support, setSupport] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [yearGroup, setYearGroup] = useState<(typeof yearGroups)[number]>("Y3");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [authError, setAuthError] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"create" | "reset">("create");
  const [loginPupil, setLoginPupil] = useState<TeacherPupilRow | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [classData, pupilData] = await Promise.all([
        fetchClassesWithPupils(),
        fetchPupils(),
      ]);
      setClasses(classData);
      setPupils(pupilData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pupils.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredPupils = useMemo(() => {
    const term = query.trim().toLowerCase();
    return pupils.filter((pupil) => {
      const classLabel = pupil.class_name ?? "unassigned";
      if (yearFilter !== "all" && pupil.year_group !== yearFilter) {
        return false;
      }
      if (classFilter === "unassigned" && pupil.class_id) {
        return false;
      }
      if (classFilter !== "all" && classFilter !== "unassigned") {
        if (pupil.class_id !== classFilter) {
          return false;
        }
      }
      if (!term) {
        return true;
      }
      return (
        pupil.display_name.toLowerCase().includes(term) ||
        classLabel.toLowerCase().includes(term) ||
        pupil.year_group?.toLowerCase().includes(term)
      );
    });
  }, [classFilter, pupils, query, yearFilter]);

  const handleAddPupil = async (event: FormEvent) => {
    event.preventDefault();
    if (!pupilName.trim()) {
      return;
    }
    try {
      await createPupil(
        selectedClass,
        pupilName.trim(),
        support ? [support.trim()] : [],
        yearGroup,
      );
      setPupilName("");
      setSupport("");
      setYearGroup("Y3");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add pupil.");
    }
  };

  const openLoginModal = (pupil: TeacherPupilRow, mode: "create" | "reset") => {
    const suggestedUsername = pupil.username ?? toUsername(pupil.display_name);
    setLoginMode(mode);
    setLoginPupil(pupil);
    setLoginUsername(suggestedUsername);
    setLoginPassword(generatePassword());
    setShowPassword(false);
    setLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginPupil(null);
    setLoginUsername("");
    setLoginPassword("");
    setShowPassword(false);
  };

  const handleConfirmLogin = async () => {
    if (!loginPupil) {
      return;
    }
    const usernameValue = loginUsername.trim();
    if (!usernameValue || !loginPassword) {
      setAuthError("Enter a username and password.");
      return;
    }

    try {
      setBusyId(loginPupil.id);
      setAuthError(null);
      if (loginMode === "create") {
        await createPupilLogin({
          pupilId: loginPupil.id,
          username: usernameValue,
          password: loginPassword,
        });
      } else {
        await resetPupilPassword(loginPupil.id, loginPassword);
      }
      await refresh();
      closeLoginModal();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Unable to update login.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePassword = async (pupil: TeacherPupilRow) => {
    if (revealedPasswords[pupil.id]) {
      setRevealedPasswords((current) => {
        const next = { ...current };
        delete next[pupil.id];
        return next;
      });
      return;
    }
    try {
      setBusyId(pupil.id);
      setAuthError(null);
      const password = await revealPupilPassword(pupil.id);
      setRevealedPasswords((current) => ({
        ...current,
        [pupil.id]: password,
      }));
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Unable to reveal password.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pupils</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Manage assignments, year groups, and class membership
          </p>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {pupils.length} pupils
        </div>
      </header>
      {authError ? (
        <p className="text-sm text-rose-600">{authError}</p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <form
          onSubmit={handleAddPupil}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Add pupil
          </p>
          <label className="mt-2 block text-xs font-medium text-slate-600">
            Class (optional)
            <select
              value={selectedClass ?? ""}
              onChange={(event) =>
                setSelectedClass(event.target.value || null)
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              <option value="">Unassigned</option>
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
            Year group
            <select
              value={yearGroup}
              onChange={(event) =>
                setYearGroup(event.target.value as typeof yearGroup)
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              {yearGroups.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
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

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <label className="text-xs font-medium text-slate-600">
              Search pupils
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, class, or year"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Filter by year
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              >
                <option value="all">All years</option>
                {yearGroups.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Filter by class
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              >
                <option value="all">All classes</option>
                <option value="unassigned">Unassigned</option>
                {classes.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Loading pupils...</p>
          ) : error ? (
            <p className="mt-4 text-sm text-rose-600">{error}</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {filteredPupils.length === 0 ? (
                <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">
                  No pupils match this search.
                </li>
              ) : (
                filteredPupils.map((pupil) => (
                  <li
                    key={pupil.id}
                    className="rounded-md bg-slate-50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={pupil.display_name}
                        onChange={(event) =>
                          setPupils((current) =>
                            current.map((entry) =>
                              entry.id === pupil.id
                                ? { ...entry, display_name: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        onBlur={async () => {
                          try {
                            setBusyId(pupil.id);
                            await updatePupil(pupil.id, {
                              display_name: pupil.display_name,
                            });
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Unable to update pupil.",
                            );
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="font-medium text-slate-800 outline-none"
                      />
                      {busyId === pupil.id && (
                        <span className="text-xs text-slate-400">
                          Saving...
                        </span>
                      )}
                      <div className="ml-auto flex flex-wrap gap-2">
                        {!pupil.auth_user_id ? (
                          <button
                            type="button"
                            onClick={() => openLoginModal(pupil, "create")}
                            className="text-xs font-semibold text-sky-600 hover:underline"
                          >
                            Create login
                          </button>
                        ) : pupil.username ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-600">
                            <span>Login ready</span>
                            <button
                              type="button"
                              onClick={() => openLoginModal(pupil, "reset")}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePassword(pupil)}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                              title="Reveal password"
                            >
                              {revealedPasswords[pupil.id] ? "Hide" : "Reveal"}
                            </button>
                            {revealedPasswords[pupil.id] ? (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {revealedPasswords[pupil.id]}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Google login</span>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Archive ${pupil.display_name}?`)) {
                              return;
                            }
                            try {
                              setBusyId(pupil.id);
                              await archivePupil(pupil.id);
                              await refresh();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Unable to archive pupil.",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="text-xs font-semibold text-slate-500 hover:underline"
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete ${pupil.display_name}? This cannot be undone.`,
                              )
                            ) {
                              return;
                            }
                            try {
                              setBusyId(pupil.id);
                              await deletePupil(pupil.id);
                              await refresh();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Unable to delete pupil.",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <label className="flex items-center gap-2">
                        Class
                        <select
                          value={pupil.class_id ?? ""}
                          onChange={async (event) => {
                            const nextClass = event.target.value || null;
                            setPupils((current) =>
                              current.map((entry) =>
                                entry.id === pupil.id
                                  ? { ...entry, class_id: nextClass }
                                  : entry,
                              ),
                            );
                            try {
                              setBusyId(pupil.id);
                              await updatePupilClass(pupil.id, nextClass);
                              await refresh();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Unable to update class assignment.",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="">Unassigned</option>
                          {classes.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2">
                        Year
                        <select
                          value={pupil.year_group ?? "Y3"}
                          onChange={async (event) => {
                            const nextYear = event.target.value as
                              (typeof yearGroups)[number];
                            setPupils((current) =>
                              current.map((entry) =>
                                entry.id === pupil.id
                                  ? { ...entry, year_group: nextYear }
                                  : entry,
                              ),
                            );
                            try {
                              setBusyId(pupil.id);
                              await updatePupil(pupil.id, {
                                year_group: nextYear,
                              });
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Unable to update pupil year.",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                        >
                          {yearGroups.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span>
                        Phase: {resolvePhaseFromYear(pupil.year_group) ?? "-"}
                      </span>
                      <span>{pupil.class_name ?? "Unassigned"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <label className="flex items-center gap-2">
                        Google email
                        <input
                          type="email"
                          value={pupil.auth_email ?? ""}
                          onChange={(event) =>
                            setPupils((current) =>
                              current.map((entry) =>
                                entry.id === pupil.id
                                  ? { ...entry, auth_email: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          onBlur={async () => {
                            try {
                              setBusyId(pupil.id);
                              const nextEmail = pupil.auth_email?.trim();
                              await updatePupil(pupil.id, {
                                auth_email: nextEmail ? nextEmail : null,
                              });
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Unable to update Google email.",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      {pupil.username ? (
                        <span>Username: {pupil.username}</span>
                      ) : null}
                    </div>
                    {pupil.needs.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Support: {pupil.needs.join(", ")}
                      </p>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </section>
      {loginModalOpen && loginPupil ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {loginMode === "create" ? "Create pupil login" : "Reset password"}
                </h3>
                <p className="text-sm text-slate-600">
                  {loginPupil.display_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLoginModal}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-medium text-slate-600">
                Username
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  disabled={loginMode === "reset"}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 disabled:bg-slate-100"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Password
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLoginModal}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogin}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {loginMode === "create" ? "Create login" : "Reset password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PupilsPanel;
