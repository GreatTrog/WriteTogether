import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchClassesWithPupils,
  fetchSubjectLinks,
  fetchTeacherWordBanks,
  type TeacherAssignment,
  type TeacherClass,
  type TeacherSubjectLink,
  type TeacherWordBank,
} from "../../services/teacherData";
import {
  TEXT_TYPE_LABELS,
  TEXT_TYPE_SUBTYPES,
  TextType,
  textTypeLabel,
  loadWordBankCatalog,
  type WordBankDocument,
  type WordBankSnapshot,
} from "../../services/wordBankCatalog";

const modeOptions = [
  { value: "mode1", label: "Mode 1 - Colourful Semantics" },
  { value: "mode2", label: "Mode 2 - Click-to-Compose" },
] as const;

type AssignmentBankOption = {
  id: string;
  title: string;
  topic: string;
  secondaryLabel: string;
  source: "library" | "catalog";
  itemCount: number;
  tags: string[];
  mode: "mode1" | "mode2";
  catalogDetails?: WordBankSnapshot;
  items?: Array<{
    text: string;
    slot?: "who" | "doing" | "what" | "where" | "when";
    isPhrase?: boolean;
  }>;
};

const resolveCatalogMode = (payload: WordBankDocument): "mode1" | "mode2" => {
  const slotLabels = new Set(["who", "doing", "what", "where", "when"]);
  const headingLabels = payload.headings.map((heading) =>
    heading.label.trim().toLowerCase(),
  );
  const hasSlotHeading = headingLabels.some((label) => slotLabels.has(label));
  return hasSlotHeading ? "mode1" : "mode2";
};

const makeCatalogOption = (payload: WordBankDocument): AssignmentBankOption => {
  const cleanedSubtype = payload.meta.sub_type.replace(/-/g, " ");
  const fallbackTitle = payload.fileName.replace(/\.txt$/, "");
  const primaryTopic = payload.meta.topic?.trim() ?? "";
  const resolvedTitle =
    primaryTopic.length > 0
      ? primaryTopic
      : cleanedSubtype.length > 0
        ? cleanedSubtype
        : fallbackTitle;
  const resolvedTopic =
    primaryTopic.length > 0
      ? primaryTopic
      : cleanedSubtype.length > 0
        ? cleanedSubtype
        : fallbackTitle;
  const totalItems = payload.headings.reduce(
    (sum, heading) => sum + heading.items.length,
    0,
  );

  return {
    id: `catalog::${payload.id}`,
    title: resolvedTitle,
    topic: resolvedTopic,
    secondaryLabel: `${payload.meta.year} - ${textTypeLabel(payload.meta.text_type)} - ${cleanedSubtype}`,
    source: "catalog",
    itemCount: totalItems,
    tags: payload.meta.keywords ?? [],
    mode: resolveCatalogMode(payload),
    catalogDetails: payload,
  };
};

// Wizard-style flow to draft writing tasks and attach the right scaffolds.
const AssignmentsPanel = () => {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [wordBanks, setWordBanks] = useState<TeacherWordBank[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [mode, setMode] = useState<"mode1" | "mode2">("mode2");
  const [dueDate, setDueDate] = useState("");
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<WordBankDocument[]>([]);
  const [catalogState, setCatalogState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [textTypeFilter, setTextTypeFilter] = useState<string>("all");
  const [subTypeFilter, setSubTypeFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [readingAgeFilter, setReadingAgeFilter] = useState<string>("all");
  const [bankSourceFilter, setBankSourceFilter] = useState<
    "all" | "catalog" | "custom"
  >("all");
  const [subjectLinks, setSubjectLinks] = useState<TeacherSubjectLink[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [classData, assignmentData, bankData, subjectRows] =
          await Promise.all([
            fetchClassesWithPupils(),
            fetchAssignments(),
            fetchTeacherWordBanks(),
            fetchSubjectLinks(),
        ]);
        setClasses(classData);
        setAssignments(assignmentData);
        setWordBanks(bankData);
        setSubjectLinks(subjectRows);
        setSelectedBanks(bankData.slice(0, 4).map((bank) => bank.id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load assignments.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    let isMounted = true;
    setCatalogState("loading");
    loadWordBankCatalog()
      .then((entries) => {
        if (!isMounted) {
          return;
        }
        setCatalog(entries);
        setCatalogState("ready");
      })
      .catch((catalogError) => {
        console.error(catalogError);
        if (!isMounted) {
          return;
        }
        setCatalog([]);
        setCatalogState("error");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const unique = (values: string[]) =>
    Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

  const catalogYears = useMemo(
    () => unique(catalog.map((doc) => doc.meta.year)),
    [catalog],
  );
  const catalogSubjectLinks = useMemo(
    () => unique(catalog.flatMap((doc) => doc.meta.subject_links ?? [])),
    [catalog],
  );
  const catalogReadingAges = useMemo(
    () =>
      unique(
        catalog
          .map((doc) => doc.meta.reading_age)
          .filter((value): value is string => Boolean(value)),
      ),
    [catalog],
  );
  const catalogSubTypes = useMemo(
    () => unique(catalog.map((doc) => doc.meta.sub_type)),
    [catalog],
  );

  const availableSubTypes = useMemo(() => {
    if (textTypeFilter === "all") {
      return catalogSubTypes.length > 0
        ? catalogSubTypes
        : Object.values(TEXT_TYPE_SUBTYPES).flat();
    }
    return TEXT_TYPE_SUBTYPES[textTypeFilter as TextType];
  }, [catalogSubTypes, textTypeFilter]);

  const filteredCatalog = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return catalog.filter((doc) => {
      if (yearFilter !== "all" && doc.meta.year !== yearFilter) {
        return false;
      }
      if (
        textTypeFilter !== "all" &&
        doc.meta.text_type !== (textTypeFilter as TextType)
      ) {
        return false;
      }
      if (subTypeFilter !== "all" && doc.meta.sub_type !== subTypeFilter) {
        return false;
      }
      if (
        subjectFilter !== "all" &&
        !(doc.meta.subject_links ?? []).includes(subjectFilter)
      ) {
        return false;
      }
      if (
        readingAgeFilter !== "all" &&
        doc.meta.reading_age !== readingAgeFilter
      ) {
        return false;
      }
      if (!normalisedQuery) {
        return true;
      }
      return doc.searchText.includes(normalisedQuery);
    });
  }, [
    catalog,
    query,
    readingAgeFilter,
    subjectFilter,
    subTypeFilter,
    textTypeFilter,
    yearFilter,
  ]);

  const libraryBanks = useMemo<AssignmentBankOption[]>(() => {
    const modeOneCategories = new Set(["verbs", "nouns", "adjectives"]);

    return wordBanks
      .filter((bank) =>
        subjectFilter === "all" ? true : bank.topic === subjectFilter,
      )
      .map((bank) => ({
        id: bank.id,
        title: bank.title,
        topic: bank.topic,
        secondaryLabel: `${bank.category} - ${bank.topic}`,
        source: "library" as const,
        itemCount: bank.items.length,
        tags: bank.tags ?? [],
        mode: modeOneCategories.has(bank.category) ? "mode1" : "mode2",
        items: bank.items,
      }));
  }, [subjectFilter, wordBanks]);

  const catalogOptions = useMemo<AssignmentBankOption[]>(
    () => filteredCatalog.map(makeCatalogOption),
    [filteredCatalog],
  );

  const subjectOptions = useMemo(() => {
    return unique([
      "English",
      "Science",
      "Geography",
      "History",
      "PSHE",
      ...subjectLinks.map((topic) => topic.label),
      ...catalogSubjectLinks,
    ]).filter(Boolean);
  }, [catalogSubjectLinks, subjectLinks]);

  const availableBanks = useMemo<AssignmentBankOption[]>(() => {
    const combined = [...catalogOptions, ...libraryBanks].filter(
      (bank) => bank.mode === mode,
    );
    if (bankSourceFilter === "catalog") {
      return combined.filter((bank) => bank.source === "catalog");
    }
    if (bankSourceFilter === "custom") {
      return combined.filter((bank) => bank.source === "library");
    }
    return combined;
  }, [bankSourceFilter, catalogOptions, libraryBanks, mode]);

  useEffect(() => {
    const allowed = new Set(availableBanks.map((bank) => bank.id));
    setSelectedBanks((prev) => prev.filter((id) => allowed.has(id)));
  }, [availableBanks]);

  const pinnedBanksOverflow = selectedBanks.length > 6;

  const handleToggleBank = (bankId: string) => {
    // Keep the selection bounded and stable so templates feel predictable.
    setSelectedBanks((prev) =>
      prev.includes(bankId)
        ? prev.filter((id) => id !== bankId)
        : prev.length >= 6
          ? prev
          : [...prev, bankId],
    );
  };

  const handleToggleExpand = (bankId: string) => {
    setExpandedBankId((prev) => (prev === bankId ? null : bankId));
  };

  const handleSubmit = async (event: FormEvent) => {
    // Snapshot the assignment into Zustand which acts as our stub data layer.
    event.preventDefault();
    if (!title.trim() || !classId || selectedBanks.length === 0) {
      return;
    }

    const optionMap = new Map<string, AssignmentBankOption>(
      availableBanks.map((bank) => [bank.id, bank]),
    );
    const resolvedSelections = selectedBanks
      .map((id) => optionMap.get(id))
      .filter((entry): entry is AssignmentBankOption => Boolean(entry));

    if (resolvedSelections.length === 0) {
      return;
    }

    const catalogWordBanks = resolvedSelections
      .filter(
        (entry): entry is AssignmentBankOption & {
          catalogDetails: WordBankSnapshot;
        } =>
          entry.source === "catalog" && Boolean(entry.catalogDetails),
      )
      .reduce<Record<string, WordBankSnapshot>>((acc, entry) => {
        acc[entry.id] = entry.catalogDetails!;
        return acc;
      }, {});

    const librarySelections = resolvedSelections.filter(
      (entry) => entry.source === "library",
    );
    const wordBankIds = librarySelections.map((entry) => entry.id).slice(0, 6);

    try {
      setError(null);
      const saved = await createAssignment({
        title: title.trim(),
        classId,
        modeLock: mode,
        dueAt: dueDate ? new Date(dueDate) : null,
        wordBankIds,
        templateId: null,
        settings: {
          slotsEnabled: mode === "mode1" ? ["who", "doing", "what", "where"] : [],
        },
        catalogWordBanks,
        status: "published",
      });

      setTitle("");
      setSelectedBanks(wordBanks.slice(0, 4).map((bank) => bank.id));
      setAssignments((prev) => [saved, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save assignment.",
      );
    }
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteAssignment = (assignmentId: string) => {
    setPendingDeleteId(assignmentId);
  };

  const cancelDeleteAssignment = () => {
    setPendingDeleteId(null);
  };

  const handleDeleteAssignment = async () => {
    if (!pendingDeleteId) {
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      await deleteAssignment(pendingDeleteId);
      setAssignments((prev) =>
        prev.filter((assignment) => assignment.id !== pendingDeleteId),
      );
      setPendingDeleteId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete assignment.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Build a new assignment
        </h2>
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <label className="text-sm font-medium text-slate-600">
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Shackleton Diary Entry"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Class
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              required
            >
              <option value="">Select class</option>
              {classes.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              {modeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Due date (optional)
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Word banks (up to 6)
            </p>
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Word bank library search
                </p>
                <span className="ml-auto text-xs font-semibold text-slate-500">
                  {catalogState === "loading"
                    ? "Loading..."
                    : `${filteredCatalog.length} result${filteredCatalog.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-medium text-slate-600">
                  Keyword search
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="kennings, forest, Science"
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  />
                </label>
                {subjectOptions.length > 0 && (
                  <label className="text-xs font-medium text-slate-600">
                    Subject link
                    <select
                      value={subjectFilter}
                      onChange={(event) => setSubjectFilter(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                    >
                      <option value="all">All subjects</option>
                      {subjectOptions.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs font-medium text-slate-600">
                  Year group
                  <select
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  >
                    <option value="all">All years</option>
                    {catalogYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Word bank source
                  <select
                    value={bankSourceFilter}
                    onChange={(event) =>
                      setBankSourceFilter(
                        event.target.value as "all" | "catalog" | "custom",
                      )
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  >
                    <option value="all">All banks</option>
                    <option value="catalog">Catalog banks</option>
                    <option value="custom">Custom banks</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Text type
                  <select
                    value={textTypeFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTextTypeFilter(value);
                      if (value === "all") {
                        setSubTypeFilter("all");
                      } else if (
                        !TEXT_TYPE_SUBTYPES[value as TextType].includes(subTypeFilter)
                      ) {
                        setSubTypeFilter("all");
                      }
                    }}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  >
                    <option value="all">All text types</option>
                    {TEXT_TYPE_LABELS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Sub-type
                  <select
                    value={subTypeFilter}
                    onChange={(event) => setSubTypeFilter(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  >
                    <option value="all">All sub-types</option>
                    {availableSubTypes.map((subType) => (
                      <option key={subType} value={subType}>
                        {subType.replace(/-/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                {catalogReadingAges.length > 0 && (
                  <label className="text-xs font-medium text-slate-600">
                    Reading age
                    <select
                      value={readingAgeFilter}
                      onChange={(event) => setReadingAgeFilter(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                    >
                      <option value="all">All ages</option>
                      {catalogReadingAges.map((age) => (
                        <option key={age} value={age}>
                          {age}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>
            {pinnedBanksOverflow && (
              <p className="mt-1 text-xs text-rose-600">
                Too many banks selected - pupils will see the first six.
              </p>
            )}
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {availableBanks.map((bank) => {
                const isSelected = selectedBanks.includes(bank.id);
                const isExpanded = expandedBankId === bank.id;
                return (
                  <div
                    key={bank.id}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(bank.id)}
                        aria-expanded={isExpanded}
                        className="flex flex-1 flex-col text-left"
                      >
                        <span className="font-semibold">{bank.title}</span>
                        <span className="mt-1 text-xs uppercase tracking-wide">
                          {bank.secondaryLabel}
                        </span>
                      </button>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleBank(bank.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 h-4 w-4 accent-emerald-500"
                        aria-label={`Select ${bank.title}`}
                      />
                    </div>
                    {isExpanded ? (
                      <div
                        className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                          isSelected
                            ? "border-slate-700 bg-slate-800/70 text-slate-100"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {bank.source === "catalog" && bank.catalogDetails ? (
                          <div className="space-y-2">
                            {bank.catalogDetails.headings.map((heading) => (
                              <div key={heading.label}>
                                <p className="text-[0.7rem] font-semibold uppercase tracking-wide">
                                  {heading.label}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {heading.items.map((item) => (
                                    <span
                                      key={`${heading.label}-${item.text}`}
                                      className="rounded-full border border-slate-200 px-2 py-0.5"
                                    >
                                      {item.text}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : bank.items && bank.items.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {bank.items.map((item) => (
                              <span
                                key={item.id}
                                className="rounded-full border border-slate-200 px-2 py-0.5"
                              >
                                {item.text}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p>No preview available.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Save assignment
            </button>
          </div>
        </form>
        {error ? (
          <p className="mt-3 text-sm text-rose-600">{error}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent assignments
          </h2>
          <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {assignments.length} total
          </span>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Assignments will appear here once created.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {assignments.map((assignment) => {
              const className =
                classes.find((group) => group.id === assignment.classId)?.name ??
                "Unknown class";
              const dueAtValue = assignment.dueAt
                ? new Date(assignment.dueAt)
                : null;
              return (
                <div
                  key={assignment.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {assignment.title}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {className} -{" "}
                        {assignment.modeLock === "mode1" ? "Mode 1" : "Mode 2"} -{" "}
                        {assignment.wordBankIds.length} bank(s)
                      </p>
                    </div>
                    <span
                      className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                        assignment.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {assignment.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => confirmDeleteAssignment(assignment.id)}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Due {dueAtValue ? dueAtValue.toLocaleDateString() : "flexible"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {pendingDeleteId ? (
        (() => {
          const pendingTitle =
            assignments.find((assignment) => assignment.id === pendingDeleteId)
              ?.title ?? "this assignment";
          return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete assignment
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {pendingTitle}
              </span>
              ? This cannot be undone.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Deleting an assignment does not remove any associated word banks.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={cancelDeleteAssignment}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAssignment}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete assignment"}
              </button>
            </div>
          </div>
        </div>
          );
        })()
      ) : null}
    </div>
  );
};

export default AssignmentsPanel;






