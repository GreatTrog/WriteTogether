import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createTeacherWordBank,
  createSubjectLink,
  deleteTeacherWordBank,
  fetchSubjectLinks,
  fetchTeacherWordBanks,
  normalizeSubjectSlug,
  resolveTeacherProfileId,
  type TeacherSubjectLink,
  type TeacherWordBank,
} from "../../services/teacherData";
import { loadWordBankCatalog } from "../../services/wordBankCatalog";

const categories = [
  { value: "nouns", label: "Nouns" },
  { value: "verbs", label: "Verbs" },
  { value: "adjectives", label: "Adjectives" },
  { value: "adverbials", label: "Adverbials" },
  { value: "connectives", label: "Connectives" },
  { value: "starters", label: "Sentence starters" },
] as const;

const levels = [
  { value: "ks1", label: "KS1" },
  { value: "lks2", label: "LKS2" },
  { value: "uks2", label: "UKS2" },
] as const;

const defaultSuggestedSubjects = [
  "English",
  "Science",
  "Geography",
  "History",
  "PSHE",
];

const distance = (a: string, b: string) => {
  if (a === b) {
    return 0;
  }
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
};

// Custom bank builder for teacher-authored banks.
const WordBanksPanel = () => {
  const [teacherBanks, setTeacherBanks] = useState<TeacherWordBank[]>([]);
  const [bankLoadState, setBankLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [bankError, setBankError] = useState<string | null>(null);
  const [subjectLinks, setSubjectLinks] = useState<TeacherSubjectLink[]>([]);
  const [subjectLinkInput, setSubjectLinkInput] = useState("");
  const [catalogSubjects, setCatalogSubjects] = useState<string[]>([]);
  const [bankFilter, setBankFilter] = useState<"all" | "mine">("all");
  const [teacherProfileId, setTeacherProfileId] = useState<string | null>(null);
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [level, setLevel] =
    useState<(typeof levels)[number]["value"]>("lks2");
  const [description, setDescription] = useState("");
  const [bankMode, setBankMode] = useState<"mode1" | "mode2">("mode2");
  const [modeOneInputs, setModeOneInputs] = useState({
    who: "",
    doing: "",
    what: "",
    where: "",
    when: "",
  });
  const [modeTwoInputs, setModeTwoInputs] = useState<Record<string, string>>(
    () =>
      categories.reduce<Record<string, string>>((acc, entry) => {
        acc[entry.value] = "";
        return acc;
      }, {}),
  );

  useEffect(() => {
    const loadBanks = async () => {
      setBankLoadState("loading");
      setBankError(null);
      try {
        const [banks, profileId, subjectRows] = await Promise.all([
          fetchTeacherWordBanks(),
          resolveTeacherProfileId(),
          fetchSubjectLinks(),
        ]);
        setTeacherBanks(banks);
        setTeacherProfileId(profileId);
        setSubjectLinks(subjectRows);
        setBankLoadState("ready");
      } catch (error) {
        console.error(error);
        setTeacherBanks([]);
        setSubjectLinks([]);
        setBankLoadState("error");
        setBankError("Unable to load teacher word banks.");
      }
    };

    void loadBanks();
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadWordBankCatalog()
      .then((entries) => {
        if (!isMounted) {
          return;
        }
        const subjects = entries.flatMap((entry) => entry.meta.subject_links ?? []);
        setCatalogSubjects(
          Array.from(new Set(subjects)).sort((a, b) => a.localeCompare(b)),
        );
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) {
          return;
        }
        setCatalogSubjects([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const subjectSlugMap = useMemo(() => {
    const map = new Map<string, TeacherSubjectLink>();
    subjectLinks.forEach((topic) => {
      map.set(topic.slug, topic);
    });
    return map;
  }, [subjectLinks]);

  const chipSubjects = useMemo(() => {
    const merged = [
      ...defaultSuggestedSubjects,
      ...catalogSubjects,
      ...subjectLinks.map((topic) => topic.label),
    ];
    const unique = Array.from(
      new Map(merged.map((label) => [label.toLowerCase(), label])).values(),
    );
    return unique.slice(0, 12);
  }, [catalogSubjects, subjectLinks]);

  const similarSubjects = useMemo(() => {
    const slug = normalizeSubjectSlug(subjectLinkInput);
    if (!slug) {
      return [];
    }
    return subjectLinks
      .map((topic) => ({
        topic,
        score: distance(slug, topic.slug),
      }))
      .filter((entry) => entry.score > 0 && entry.score <= 2)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((entry) => entry.topic);
  }, [subjectLinkInput, subjectLinks]);

  const handleToggleExpand = (bankId: string) => {
    setExpandedBankId((prev) => (prev === bankId ? null : bankId));
  };

  const confirmDeleteBank = (bankId: string) => {
    setPendingDeleteId(bankId);
  };

  const cancelDeleteBank = () => {
    setPendingDeleteId(null);
  };

  const handleDeleteBank = async () => {
    if (!pendingDeleteId) {
      return;
    }
    try {
      setIsDeleting(true);
      setBankError(null);
      await deleteTeacherWordBank(pendingDeleteId);
      setTeacherBanks((prev) =>
        prev.filter((bank) => bank.id !== pendingDeleteId),
      );
      setPendingDeleteId(null);
    } catch (error) {
      console.error(error);
      setBankError("Unable to delete word bank.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    const subjectLabel = subjectLinkInput.trim();
    const subjectSlug = subjectLabel ? normalizeSubjectSlug(subjectLabel) : "";
    const existingSubject = subjectSlug ? subjectSlugMap.get(subjectSlug) : undefined;

    const resolveSubject = async () => {
      if (!subjectLabel) {
        return null;
      }
      if (existingSubject) {
        return existingSubject;
      }
      const created = await createSubjectLink(subjectLabel);
      setSubjectLinks((prev) =>
        prev.some((topic) => topic.id === created.id)
          ? prev
          : [...prev, created].sort((a, b) => a.label.localeCompare(b.label)),
      );
      return created;
    };

    if (bankMode === "mode1") {
      const slotEntries = Object.entries(modeOneInputs).filter(([, value]) =>
        value.trim(),
      );
      if (slotEntries.length === 0) {
        return;
      }
      const items = slotEntries.flatMap(([slot, value]) =>
        value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((text) => ({
            text,
            tags: [],
            slot: slot as "who" | "doing" | "what" | "where" | "when",
          })),
      );

      resolveSubject()
        .then((resolvedSubject) =>
          createTeacherWordBank({
            title: title.trim(),
            description: description.trim() || undefined,
            level: level as "ks1" | "lks2" | "uks2",
            tags: [
              resolvedSubject ? `subject:${resolvedSubject.slug}` : undefined,
              "mode:1",
            ].filter(Boolean) as string[],
            colourMap: undefined,
            category: "nouns",
            topic: resolvedSubject?.label ?? "General",
            items,
          }),
        )
        .then((created) => {
          setTeacherBanks((prev) => [created, ...prev]);
          setTitle("");
          setSubjectLinkInput("");
          setDescription("");
          setModeOneInputs({
            who: "",
            doing: "",
            what: "",
            where: "",
            when: "",
          });
        })
        .catch((error) => {
          console.error(error);
          setBankError("Unable to save word bank.");
        });
      return;
    }

    const combinedItems = categories.flatMap((category) => {
      const raw = modeTwoInputs[category.value] ?? "";
      const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.map((text) => ({
        text,
        tags: [`grammar:${category.value}`],
      }));
    });

    if (combinedItems.length === 0) {
      return;
    }

    resolveSubject()
      .then((resolvedSubject) => {
        const subjectTag = resolvedSubject
          ? `subject:${resolvedSubject.slug}`
          : undefined;
        const subjectLabelValue = resolvedSubject?.label ?? "General";
        return createTeacherWordBank({
          title: title.trim(),
          description: description.trim() || undefined,
          level: level as "ks1" | "lks2" | "uks2",
          tags: [subjectTag, "mode:2"].filter(Boolean) as string[],
          colourMap: undefined,
          category: "mixed",
          topic: subjectLabelValue,
          items: combinedItems,
        });
      })
      .then((createdBank) => {
        setTeacherBanks((prev) => [createdBank, ...prev]);
        setTitle("");
        setSubjectLinkInput("");
        setDescription("");
        setModeTwoInputs(
          categories.reduce<Record<string, string>>((acc, entry) => {
            acc[entry.value] = "";
            return acc;
          }, {}),
        );
      })
      .catch((error) => {
        console.error(error);
        setBankError("Unable to save word bank.");
      });
  };

  const filteredTeacherBanks = useMemo(() => {
    if (bankFilter === "mine" && teacherProfileId) {
      return teacherBanks.filter((bank) => bank.ownerId === teacherProfileId);
    }
    return teacherBanks;
  }, [bankFilter, teacherBanks, teacherProfileId]);

  const displayBanks = useMemo(
    () =>
      filteredTeacherBanks.filter(
        (bank) => bank.category === "mixed" || bank.category === "nouns",
      ),
    [filteredTeacherBanks],
  );

  const bankSectionLabels = useMemo(
    () => new Map(categories.map((category) => [category.value, category.label])),
    [],
  );

  const buildBankSections = (bank: TeacherWordBank) => {
    if (bank.category === "mixed") {
      const grouped = new Map<string, string[]>();
      bank.items.forEach((item) => {
        const grammarTag = item.tags?.find((tag) => tag.startsWith("grammar:"));
        const category = grammarTag?.split(":")[1] ?? "other";
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(item.text);
      });
      const ordered = Array.from(grouped.entries()).sort((a, b) => {
        const labelA = bankSectionLabels.get(a[0]) ?? a[0];
        const labelB = bankSectionLabels.get(b[0]) ?? b[0];
        return labelA.localeCompare(labelB);
      });
      return ordered.map(([category, items]) => ({
        label: bankSectionLabels.get(category) ?? category,
        items,
      }));
    }

    if (bank.category === "nouns") {
      const slotOrder = ["who", "doing", "what", "where", "when"];
      const grouped = new Map<string, string[]>();
      bank.items.forEach((item) => {
        const slot = item.slot ?? "other";
        if (!grouped.has(slot)) {
          grouped.set(slot, []);
        }
        grouped.get(slot)!.push(item.text);
      });
      const ordered = slotOrder
        .filter((slot) => grouped.has(slot))
        .map((slot) => ({
          label: slot,
          items: grouped.get(slot)!,
        }));
      const remaining = Array.from(grouped.entries())
        .filter(([slot]) => !slotOrder.includes(slot))
        .map(([slot, items]) => ({
          label: slot,
          items,
        }));
      return [...ordered, ...remaining];
    }

    return [
      {
        label: bank.category,
        items: bank.items.map((item) => item.text),
      },
    ];
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Add custom word bank
        </h2>
        <form
          onSubmit={handleSubmit}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
          <label className="text-sm font-medium text-slate-600">
            Bank type
            <select
              value={bankMode}
              onChange={(event) =>
                setBankMode(event.target.value as "mode1" | "mode2")
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              <option value="mode1">Mode 1 (Who / Doing / What / Where / When)</option>
              <option value="mode2">Mode 2 (Word classes)</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Collaboration Tools"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Subject link
            <div className="mt-2 flex flex-wrap gap-2">
              {chipSubjects.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSubjectLinkInput(label)}
                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  {label}
                </button>
              ))}
            </div>
            {similarSubjects.length > 0 ? (
              <div className="mt-2 space-y-2 text-xs text-amber-600">
                <p>Similar subjects:</p>
                <div className="flex flex-wrap gap-2">
                  {similarSubjects.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSubjectLinkInput(topic.label)}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              Create a new subject link if nothing matches.
            </p>
            <input
              type="text"
              value={subjectLinkInput}
              onChange={(event) => setSubjectLinkInput(event.target.value)}
              placeholder="e.g. History"
              list="teacher-subject-list"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
            <datalist id="teacher-subject-list">
              {subjectLinks.map((topic) => (
                <option key={topic.id} value={topic.label} />
              ))}
            </datalist>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Level
            <select
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as (typeof levels)[number]["value"])
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              {levels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2 text-sm font-medium text-slate-600">
            Description (optional)
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>
          {bankMode === "mode1" ? (
            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
              {(
                [
                  ["who", "Who"],
                  ["doing", "Doing"],
                  ["what", "What"],
                  ["where", "Where"],
                  ["when", "When"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-slate-600">
                  {label} (one per line)
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    Single words or short phrases are both fine.
                  </p>
                  <textarea
                    value={modeOneInputs[key]}
                    onChange={(event) =>
                      setModeOneInputs((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder={`Add ${label.toLowerCase()} words`}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
              {categories.map((option) => (
                <label
                  key={option.value}
                  className="text-sm font-medium text-slate-600"
                >
                  {option.label} (one per line)
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    Single words or short phrases are both fine.
                  </p>
                  <textarea
                    value={modeTwoInputs[option.value] ?? ""}
                    onChange={(event) =>
                      setModeTwoInputs((prev) => ({
                        ...prev,
                        [option.value]: event.target.value,
                      }))
                    }
                    placeholder={`Add ${option.label.toLowerCase()} words`}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Save word bank
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Custom bank overview
          </h2>
          <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600">
            Show
            <select
              value={bankFilter}
              onChange={(event) => setBankFilter(event.target.value as "all" | "mine")}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
            >
              <option value="all">All teacher banks</option>
              <option value="mine">My banks only</option>
            </select>
          </label>
        </div>
        {bankError ? (
          <p className="mt-3 text-sm text-rose-600">{bankError}</p>
        ) : null}
        {bankLoadState === "loading" ? (
          <p className="mt-3 text-sm text-slate-600">Loading teacher banks...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {displayBanks.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                No custom banks yet.
              </div>
            ) : (
              displayBanks.map((bank) => {
                const isExpanded = expandedBankId === bank.id;
                const sections = buildBankSections(bank);
                return (
                  <div
                    key={bank.id}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(bank.id)}
                        aria-expanded={isExpanded}
                        className="flex flex-1 flex-col text-left"
                      >
                        <span className="font-semibold text-slate-800">
                          {bank.title}
                        </span>
                        <span className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                          {bank.topic} - {bank.items.length} words
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteBank(bank.id)}
                        className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                    {isExpanded ? (
                      <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        {sections.map((section) => (
                          <div key={section.label}>
                            <p className="text-[0.7rem] font-semibold uppercase tracking-wide">
                              {section.label}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {section.items.map((item) => (
                                <span
                                  key={`${section.label}-${item}`}
                                  className="rounded-full border border-slate-200 px-2 py-0.5"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
      {pendingDeleteId ? (
        (() => {
          const pendingTitle =
            teacherBanks.find((bank) => bank.id === pendingDeleteId)?.title ??
            "this word bank";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete word bank
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    {pendingTitle}
                  </span>
                  ? This cannot be undone.
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelDeleteBank}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteBank}
                    className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete word bank"}
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

export default WordBanksPanel;
