import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  ensurePupilAuthApiAvailable,
  revealPupilPassword,
  resetPupilPassword,
} from "../../services/pupilAuthApi";

const yearGroups = ["Y1", "Y2", "Y3", "Y4", "Y5", "Y6"] as const;
type YearGroup = (typeof yearGroups)[number];
const importMaxFileSizeBytes = 1024 * 1024;

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

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

const normalizeYearGroup = (value: string | undefined): YearGroup => {
  const normalized = (value ?? "").trim().toUpperCase();
  return yearGroups.includes(normalized as YearGroup)
    ? (normalized as YearGroup)
    : "Y3";
};

const csvEscape = (value: string) => {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((part) => part.length > 0));
};

type LoginSeed = { username?: string; password?: string };

const PupilsPanel = () => {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [pupils, setPupils] = useState<TeacherPupilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pupilName, setPupilName] = useState("");
  const [support, setSupport] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [yearGroup, setYearGroup] = useState<(typeof yearGroups)[number]>("Y3");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [authError, setAuthError] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [selectedPupilIds, setSelectedPupilIds] = useState<string[]>([]);
  const [bulkClassTarget, setBulkClassTarget] = useState<string>("");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"create" | "reset">("create");
  const [loginPupil, setLoginPupil] = useState<TeacherPupilRow | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importProcessing, setImportProcessing] = useState(false);

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
      setSelectedPupilIds((current) =>
        current.filter((id) => pupilData.some((pupil) => pupil.id === id)),
      );
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

  const usedUsernames = useMemo(() => {
    return new Set(
      pupils
        .map((pupil) => pupil.username?.toLowerCase().trim())
        .filter((value): value is string => Boolean(value)),
    );
  }, [pupils]);

  const selectedSet = useMemo(() => new Set(selectedPupilIds), [selectedPupilIds]);
  const selectedPupils = useMemo(
    () => pupils.filter((pupil) => selectedSet.has(pupil.id)),
    [pupils, selectedSet],
  );
  const filteredIds = useMemo(() => filteredPupils.map((pupil) => pupil.id), [filteredPupils]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));

  const buildUniqueUsername = (rawName: string, preferred?: string) => {
    const preferredSanitized = preferred
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "")
      .slice(0, 24);
    const base = preferredSanitized || toUsername(rawName) || "pupil";
    let candidate = base;
    let suffix = 1;
    while (usedUsernames.has(candidate)) {
      suffix += 1;
      const suffixText = `${suffix}`;
      candidate = `${base.slice(0, Math.max(1, 24 - suffixText.length))}${suffixText}`;
    }
    usedUsernames.add(candidate);
    return candidate;
  };

  const createLoginForPupil = async (
    pupil: Pick<TeacherPupilRow, "id" | "display_name">,
    seed: LoginSeed = {},
  ) => {
    const maxAttempts = 8;
    let attempt = 0;
    let username = buildUniqueUsername(pupil.display_name, seed.username);
    const password = seed.password || generatePassword();
    let lastError: unknown = null;

    while (attempt < maxAttempts) {
      try {
        await createPupilLogin({
          pupilId: pupil.id,
          username,
          password,
        });
        return { username, password };
      } catch (err) {
        lastError = err;
        attempt += 1;
        if (
          err instanceof Error &&
          /already|exists|duplicate|registered|taken/i.test(err.message)
        ) {
          username = buildUniqueUsername(pupil.display_name, `${username}${attempt + 1}`);
          continue;
        }
        break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to create login.");
  };

  const handleAddPupil = async (event: FormEvent) => {
    event.preventDefault();
    if (!pupilName.trim()) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await ensurePupilAuthApiAvailable();
      const createdPupil = await createPupil(
        selectedClass,
        pupilName.trim(),
        support ? [support.trim()] : [],
        yearGroup,
      );
      let credentials: { username: string; password: string };
      try {
        credentials = await createLoginForPupil(createdPupil);
      } catch (loginError) {
        await deletePupil(createdPupil.id);
        throw loginError;
      }
      setPupilName("");
      setSupport("");
      setYearGroup("Y3");
      setRevealedPasswords((current) => ({
        ...current,
        [createdPupil.id]: credentials.password,
      }));
      setNotice(
        `Created login for ${createdPupil.display_name}: ${credentials.username} / ${credentials.password}`,
      );
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
        const credentials = await createLoginForPupil(loginPupil, {
          username: usernameValue,
          password: loginPassword,
        });
        setRevealedPasswords((current) => ({
          ...current,
          [loginPupil.id]: credentials.password,
        }));
      } else {
        await resetPupilPassword(loginPupil.id, loginPassword);
        setRevealedPasswords((current) => ({
          ...current,
          [loginPupil.id]: loginPassword,
        }));
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

  const toggleSelectedPupil = (pupilId: string) => {
    setSelectedPupilIds((current) =>
      current.includes(pupilId)
        ? current.filter((id) => id !== pupilId)
        : [...current, pupilId],
    );
  };

  const toggleSelectFiltered = () => {
    if (allFilteredSelected) {
      setSelectedPupilIds((current) =>
        current.filter((id) => !filteredIds.includes(id)),
      );
      return;
    }
    setSelectedPupilIds((current) => {
      const next = new Set(current);
      filteredIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleBulkArchive = async () => {
    if (selectedPupilIds.length === 0) {
      setError("Select at least one pupil.");
      return;
    }
    const required = `ARCHIVE ${selectedPupilIds.length}`;
    const confirmation = window.prompt(
      `Archive ${selectedPupilIds.length} pupils.\nType "${required}" to confirm.`,
    );
    if (confirmation !== required) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const results = await Promise.allSettled(
        selectedPupilIds.map((pupilId) => archivePupil(pupilId)),
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      await refresh();
      setSelectedPupilIds([]);
      setNotice(
        failed === 0
          ? `Archived ${results.length} pupils.`
          : `Archived ${results.length - failed} pupils, ${failed} failed.`,
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPupilIds.length === 0) {
      setError("Select at least one pupil.");
      return;
    }
    const required = `DELETE ${selectedPupilIds.length}`;
    const confirmation = window.prompt(
      `Delete ${selectedPupilIds.length} pupils.\nThis cannot be undone.\nType "${required}" to confirm.`,
    );
    if (confirmation !== required) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const results = await Promise.allSettled(
        selectedPupilIds.map((pupilId) => deletePupil(pupilId)),
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      await refresh();
      setSelectedPupilIds([]);
      setNotice(
        failed === 0
          ? `Deleted ${results.length} pupils.`
          : `Deleted ${results.length - failed} pupils, ${failed} failed.`,
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportLogins = async () => {
    const targets = selectedPupils.length > 0 ? selectedPupils : filteredPupils;
    if (targets.length === 0) {
      setError("No pupils available to export.");
      return;
    }
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const lines: string[][] = [
        [
          "pupil_id",
          "display_name",
          "class_name",
          "class_id",
          "year_group",
          "username",
          "password",
          "auth_email",
          "support_needs",
        ],
      ];
      for (const pupil of targets) {
        let password = "";
        if (pupil.username && pupil.auth_user_id) {
          try {
            password = await revealPupilPassword(pupil.id);
          } catch {
            password = "";
          }
        }
        lines.push([
          pupil.id,
          pupil.display_name,
          pupil.class_name ?? "",
          pupil.class_id ?? "",
          pupil.year_group ?? "",
          pupil.username ?? "",
          password,
          pupil.auth_email ?? "",
          pupil.needs.join(";"),
        ]);
      }
      const csv = lines
        .map((line) => line.map((part) => csvEscape(part)).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pupil-logins-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Exported ${targets.length} pupil login rows.`);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      ["display_name", "class_name", "year_group"],
      ["Pupil A", "Maple Class", "Y3"],
      ["Pupil B", "Maple Class", "Y3"],
    ];
    const csv = templateRows
      .map((line) => line.map((part) => csvEscape(part)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pupil-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const isCsvFile =
      file.name.toLowerCase().endsWith(".csv") ||
      file.type.toLowerCase().includes("csv");
    if (!isCsvFile) {
      setError("Upload a .csv file.");
      event.target.value = "";
      return;
    }
    if (file.size > importMaxFileSizeBytes) {
      setError("CSV file is too large. Maximum size is 1MB.");
      event.target.value = "";
      return;
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setError("CSV file is empty.");
      event.target.value = "";
      return;
    }
    const header = rows[0].map((entry) => normalizeHeader(entry));
    const col = (name: string) => header.indexOf(name);
    const displayNameIndex = col("display_name");
    const yearGroupIndex = col("year_group");
    const classNameIndex = col("class_name");

    const missingColumns = [
      displayNameIndex < 0 ? "display_name" : null,
      classNameIndex < 0 ? "class_name" : null,
      yearGroupIndex < 0 ? "year_group" : null,
    ].filter((entry): entry is string => Boolean(entry));
    if (missingColumns.length > 0) {
      setError(
        `CSV is missing required columns: ${missingColumns.join(", ")}.`,
      );
      event.target.value = "";
      return;
    }

    const classByName = new Map(
      classes.map((group) => [group.name.trim().toLowerCase(), group.id]),
    );
    const knownClassNames = classes.map((group) => group.name).sort();
    const importRows = rows.slice(1);
    if (importRows.length > 500) {
      setError("CSV has too many rows. Maximum 500 pupils per upload.");
      event.target.value = "";
      return;
    }

    const validationErrors: string[] = [];
    const parsedRows = importRows.map((row, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const displayName = row[displayNameIndex]?.trim() ?? "";
      const className = row[classNameIndex]?.trim() ?? "";
      const yearGroupValue = row[yearGroupIndex]?.trim().toUpperCase() ?? "";

      if (!displayName) {
        validationErrors.push(`Row ${rowNumber}: display_name is required.`);
      }
      if (!className) {
        validationErrors.push(`Row ${rowNumber}: class_name is required.`);
      }
      if (!yearGroupValue) {
        validationErrors.push(`Row ${rowNumber}: year_group is required.`);
      }
      if (yearGroupValue && !yearGroups.includes(yearGroupValue as YearGroup)) {
        validationErrors.push(
          `Row ${rowNumber}: year_group must be one of ${yearGroups.join(", ")}.`,
        );
      }

      const resolvedClassId = classByName.get(className.toLowerCase()) ?? null;
      if (className && !resolvedClassId) {
        validationErrors.push(
          `Row ${rowNumber}: class_name "${className}" was not found.`,
        );
      }

      return {
        rowNumber,
        displayName,
        className,
        resolvedClassId,
        yearGroup: normalizeYearGroup(yearGroupValue),
      };
    });

    if (validationErrors.length > 0) {
      const preview = validationErrors.slice(0, 8).join("\n");
      const remaining = validationErrors.length - 8;
      setError(
        [
          "Import failed validation:",
          preview,
          remaining > 0 ? `...and ${remaining} more issue(s).` : "",
          knownClassNames.length > 0
            ? `Known classes: ${knownClassNames.join(", ")}`
            : "No classes found yet. Create a class first.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      event.target.value = "";
      return;
    }

    setBulkBusy(true);
    setImportProcessing(true);
    setError(null);
    setNotice(null);
    let created = 0;
    const createErrors: string[] = [];

    try {
      await ensurePupilAuthApiAvailable();
      for (const row of parsedRows) {
        let createdPupil: TeacherPupilRow | null = null;
        try {
          const pupil = await createPupil(
            row.resolvedClassId,
            row.displayName,
            [],
            row.yearGroup,
          );
          createdPupil = pupil;
          const credentials = await createLoginForPupil(pupil);
          setRevealedPasswords((current) => ({
            ...current,
            [pupil.id]: credentials.password,
          }));
          created += 1;
        } catch (err) {
          if (createdPupil) {
            try {
              await deletePupil(createdPupil.id);
            } catch {
              // Keep the original error in output and continue processing.
            }
          }
          createErrors.push(
            `Row ${row.rowNumber}: ${err instanceof Error ? err.message : "Unable to create pupil."}`,
          );
        }
      }
      await refresh();
      if (createErrors.length > 0) {
        const preview = createErrors.slice(0, 8).join("\n");
        const remaining = createErrors.length - 8;
        setError(
          [
            `Imported ${created} pupils.`,
            "Some rows failed during creation:",
            preview,
            remaining > 0 ? `...and ${remaining} more issue(s).` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } else {
        setNotice(`Imported ${created} pupils with logins.`);
      }
    } finally {
      setBulkBusy(false);
      setImportProcessing(false);
      event.target.value = "";
    }
  };

  const handleBulkClassChange = async () => {
    if (selectedPupilIds.length === 0) {
      setError("Select at least one pupil.");
      return;
    }
    if (!bulkClassTarget) {
      setError("Choose a class for the selected pupils.");
      return;
    }

    const nextClassId = bulkClassTarget === "unassigned" ? null : bulkClassTarget;
    const nextClassName = nextClassId
      ? classes.find((group) => group.id === nextClassId)?.name ?? "selected class"
      : "Unassigned";

    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const results = await Promise.allSettled(
        selectedPupilIds.map((pupilId) => updatePupilClass(pupilId, nextClassId)),
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      await refresh();
      if (failed === 0) {
        setSelectedPupilIds([]);
      }
      setNotice(
        failed === 0
          ? `Moved ${results.length} pupils to ${nextClassName}.`
          : `Moved ${results.length - failed} pupils to ${nextClassName}; ${failed} failed.`,
      );
    } finally {
      setBulkBusy(false);
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
      {error ? <p className="whitespace-pre-line text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={bulkBusy || loading}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={bulkBusy}
            className="rounded-md border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download template CSV
          </button>
          <button
            type="button"
            onClick={handleExportLogins}
            disabled={bulkBusy || loading}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export logins CSV
          </button>
          <select
            value={bulkClassTarget}
            onChange={(event) => setBulkClassTarget(event.target.value)}
            disabled={bulkBusy || loading}
            className="rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Bulk class target</option>
            <option value="unassigned">Unassigned</option>
            {classes.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkClassChange}
            disabled={bulkBusy || selectedPupilIds.length === 0 || !bulkClassTarget}
            className="rounded-md border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Change class ({selectedPupilIds.length})
          </button>
          <button
            type="button"
            onClick={handleBulkArchive}
            disabled={bulkBusy || selectedPupilIds.length === 0}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Archive selected ({selectedPupilIds.length})
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkBusy || selectedPupilIds.length === 0}
            className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete selected ({selectedPupilIds.length})
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportCsv}
            className="hidden"
          />
          <p className="ml-auto text-xs text-slate-500">
            Export uses selected pupils, or current filtered list when none selected.
          </p>
        </div>
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
          CSV import instructions: fill only `display_name`, `class_name`, and `year_group`.
          The upload creates pupil logins automatically and generates usernames/passwords.
        </div>
      </section>

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
            Add pupil + create login
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[auto_1.4fr_1fr_1fr]">
            <label className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectFiltered}
                className="h-4 w-4 rounded border-slate-300"
              />
              Select filtered
            </label>
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
                        type="checkbox"
                        checked={selectedSet.has(pupil.id)}
                        onChange={() => toggleSelectedPupil(pupil.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
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
                x
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
      {importProcessing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Processing Account Creation
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Creating pupil accounts and logins from your CSV. Please keep this window open.
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-500" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PupilsPanel;
