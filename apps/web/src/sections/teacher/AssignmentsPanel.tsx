import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTeacherStore } from "../../store/useTeacherStore";
import {
  textTypeLabel,
  type WordBankSnapshot,
} from "../../services/wordBankCatalog";

const modeOptions = [
  { value: "mode1", label: "Mode 1 - Colourful Semantics" },
  { value: "mode2", label: "Mode 2 - Click-to-Compose" },
] as const;

type CatalogWordBankPayload = WordBankSnapshot;

type AssignmentBankOption = {
  id: string;
  title: string;
  topic: string;
  secondaryLabel: string;
  source: "library" | "catalog";
  itemCount: number;
  tags: string[];
  catalogDetails?: WordBankSnapshot;
};

const makeCatalogOption = (payload: CatalogWordBankPayload): AssignmentBankOption => {
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
    catalogDetails: payload,
  };
};

// Wizard-style flow to draft writing tasks and attach the right scaffolds.
const AssignmentsPanel = () => {
  const { classes, wordBanks, assignments, createAssignment } = useTeacherStore();
  const location = useLocation<{ catalogWordBank?: CatalogWordBankPayload } | null>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [mode, setMode] = useState<"mode1" | "mode2">("mode2");
  const [dueDate, setDueDate] = useState("");
  const [wordLimit, setWordLimit] = useState(180);
  const [enableTTS, setEnableTTS] = useState(true);
  const [selectedBanks, setSelectedBanks] = useState<string[]>(() =>
    wordBanks.slice(0, 4).map((bank) => bank.id),
  );
  const [catalogBank, setCatalogBank] = useState<AssignmentBankOption | null>(null);

  useEffect(() => {
    const payload = location.state?.catalogWordBank;
    if (!payload) {
      return;
    }

    const option = makeCatalogOption(payload);
    setCatalogBank(option);
    setSelectedBanks((prev) => {
      if (prev.includes(option.id)) {
        return prev;
      }
      const merged = [option.id, ...prev];
      return merged.slice(0, 6);
    });
    setTitle((prev) => {
      if (prev.trim().length > 0) {
        return prev;
      }
      if (payload.meta.topic?.trim()) {
        return `${payload.meta.topic} writing task`;
      }
      return prev;
    });

    navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  const libraryBanks = useMemo<AssignmentBankOption[]>(() => {
    // Filter the static demo banks to match the chosen pupil mode.
    const allowedCategories =
      mode === "mode1" ? new Set(["verbs", "nouns", "adjectives"]) : null;

    return wordBanks
      .filter((bank) =>
        allowedCategories ? allowedCategories.has(bank.category) : true,
      )
      .map((bank) => ({
        id: bank.id,
        title: bank.title,
        topic: bank.topic,
        secondaryLabel: `${bank.category} - ${bank.topic}`,
        source: "library" as const,
        itemCount: bank.items.length,
        tags: bank.tags ?? [],
      }));
  }, [wordBanks, mode]);

  const availableBanks = useMemo<AssignmentBankOption[]>(() => {
    // Merge the teacher library with any catalog import the user just pulled in.
    const combined = [...libraryBanks];
    if (catalogBank) {
      const existingIndex = combined.findIndex(
        (bank) => bank.id === catalogBank.id,
      );
      if (existingIndex >= 0) {
        combined.splice(existingIndex, 1, catalogBank);
      } else {
        combined.unshift(catalogBank);
      }
    }
    return combined;
  }, [libraryBanks, catalogBank]);

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

  const handleSubmit = (event: FormEvent) => {
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

    const wordBankIds = resolvedSelections.map((entry) => entry.id).slice(0, 6);

    createAssignment({
      title: title.trim(),
      classId,
      modeLock: mode,
      dueAt: dueDate ? new Date(dueDate) : null,
      wordBankIds,
      templateId: null,
      settings: {
        enableTTS,
        wordLimit,
        slotsEnabled: mode === "mode1" ? ["who", "doing", "what", "where"] : [],
      },
      catalogWordBanks,
    });

    setTitle("");
    setSelectedBanks(wordBanks.slice(0, 4).map((bank) => bank.id));
    setCatalogBank(null);
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
          <label className="text-sm font-medium text-slate-600">
            Word limit
            <input
              type="number"
              min={60}
              max={320}
              step={10}
              value={wordLimit}
              onChange={(event) => setWordLimit(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={enableTTS}
              onChange={(event) => setEnableTTS(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Enable read back (TTS)
          </label>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Word banks (up to 6)
            </p>
            {pinnedBanksOverflow && (
              <p className="mt-1 text-xs text-rose-600">
                Too many banks selected - pupils will see the first six.
              </p>
            )}
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {availableBanks.map((bank) => {
                const isSelected = selectedBanks.includes(bank.id);
                return (
                  <label
                    key={bank.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{bank.title}</span>
                      <span className="mt-1 text-xs uppercase tracking-wide">
                        {bank.secondaryLabel}
                      </span>
                      <span className="mt-1 text-[0.65rem] uppercase tracking-wide">
                        {bank.source === "catalog" ? "Catalog import" : "Library bank"} -{" "}
                        {bank.itemCount} entries
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleBank(bank.id)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </label>
                );
              })}
            </div>

            {catalogBank?.catalogDetails ? (
              <div className="mt-3 space-y-2 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    Catalog preview - {catalogBank.secondaryLabel}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                    {catalogBank.itemCount} entries
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {catalogBank.catalogDetails.headings.map((heading) => {
                    const previewItems = heading.items
                      .slice(0, 4)
                      .map((item) => (item.isPhrase ? `[${item.text}]` : item.text))
                      .join(", ");
                    const hasMore = heading.items.length > 4;
                    return (
                      <div key={`${catalogBank.id}-${heading.label}`}>
                        <p className="font-semibold text-slate-700">{heading.label}</p>
                        <p className="mt-1 text-slate-500">
                          {previewItems}
                          {hasMore ? ", ..." : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
        {assignments.length === 0 ? (
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
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Due {dueAtValue ? dueAtValue.toLocaleDateString() : "flexible"} - TTS{" "}
                    {assignment.settings?.enableTTS ? "on" : "off"} - Word limit{" "}
                    {assignment.settings?.wordLimit ?? "--"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default AssignmentsPanel;






