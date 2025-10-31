import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeacherStore } from "../../store/useTeacherStore";
import {
  catalogReadingAges,
  catalogSubjectLinks,
  catalogSubTypes,
  catalogYears,
  TEXT_TYPE_LABELS,
  TEXT_TYPE_SUBTYPES,
  TextType,
  textTypeLabel,
  wordBankCatalog,
  type WordBankSnapshot,
} from "../../services/wordBankCatalog";

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

const ALL = "all";

const describeHeadings = (doc: WordBankSnapshot) =>
  doc.headings
    .map((heading) => `${heading.label} (${heading.items.length})`)
    .join(", ");

type CatalogWordBankState = WordBankSnapshot;

// Catalog browser plus custom bank builder used by both modes.
const WordBanksPanel = () => {
  const { wordBanks, addWordBank } = useTeacherStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [textTypeFilter, setTextTypeFilter] = useState<string>(ALL);
  const [subTypeFilter, setSubTypeFilter] = useState<string>(ALL);
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL);
  const [readingAgeFilter, setReadingAgeFilter] = useState<string>(ALL);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("General");
  const [category, setCategory] =
    useState<(typeof categories)[number]["value"]>("nouns");
  const [level, setLevel] =
    useState<(typeof levels)[number]["value"]>("lks2");
  const [items, setItems] = useState("");
  const [description, setDescription] = useState("");

  const availableSubTypes = useMemo(() => {
    // When a text type is chosen, limit the subtype filter to relevant options.
    if (textTypeFilter === ALL) {
      return catalogSubTypes;
    }
    return TEXT_TYPE_SUBTYPES[textTypeFilter as TextType];
  }, [textTypeFilter]);

  const filteredCatalog = useMemo(() => {
    // Apply the faceted filters to the locally bundled word bank catalog.
    const normalisedQuery = query.trim().toLowerCase();

    return wordBankCatalog.filter((doc) => {
      if (yearFilter !== ALL && doc.meta.year !== yearFilter) {
        return false;
      }
      if (
        textTypeFilter !== ALL &&
        doc.meta.text_type !== (textTypeFilter as TextType)
      ) {
        return false;
      }
      if (subTypeFilter !== ALL && doc.meta.sub_type !== subTypeFilter) {
        return false;
      }
      if (
        subjectFilter !== ALL &&
        !(doc.meta.subject_links ?? []).includes(subjectFilter)
      ) {
        return false;
      }
      if (
        readingAgeFilter !== ALL &&
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
    query,
    readingAgeFilter,
    subjectFilter,
    subTypeFilter,
    textTypeFilter,
    yearFilter,
  ]);

  const hasFiltersApplied =
    query.trim().length > 0 ||
    yearFilter !== ALL ||
    textTypeFilter !== ALL ||
    subTypeFilter !== ALL ||
    subjectFilter !== ALL ||
    readingAgeFilter !== ALL;

  const handleSubmit = (event: FormEvent) => {
    // Capture quick teacher-authored lists and push them into the shared store.
    event.preventDefault();
    if (!title.trim() || !items.trim()) {
      return;
    }
    const itemLines = items
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    addWordBank({
      title: title.trim(),
      description: description.trim() || undefined,
      level: level as "ks1" | "lks2" | "uks2",
      tags: [`topic:${topic.toLowerCase()}`, `grammar:${category}`],
      colourMap: undefined,
      category,
      topic,
      items: itemLines.map((text, index) => ({
        id: `${title.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        text,
        tags: [],
      })),
    });

    setTitle("");
    setTopic("General");
    setItems("");
    setDescription("");
  };

  const customGroups = useMemo(() => {
    // Group saved banks by category so the overview mirrors the library tabs.
    return categories.map((entry) => ({
      ...entry,
      banks: wordBanks.filter((bank) => bank.category === entry.value),
    }));
  }, [wordBanks]);

  const resetFilters = () => {
    setQuery("");
    setYearFilter(ALL);
    setTextTypeFilter(ALL);
    setSubTypeFilter(ALL);
    setSubjectFilter(ALL);
    setReadingAgeFilter(ALL);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Word bank library search
            </h2>
            <p className="text-sm text-slate-500">
              Filter by year, text type, or keywords to locate curated banks.
            </p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {filteredCatalog.length} result
            {filteredCatalog.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-slate-600">
            Keyword search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="kennings, forest, Science"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>

          <label className="text-sm font-medium text-slate-600">
            Year group
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              <option value={ALL}>All years</option>
              {catalogYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-600">
            Text type
            <select
              value={textTypeFilter}
              onChange={(event) => {
                const value = event.target.value;
                setTextTypeFilter(value);
                if (value === ALL) {
                  setSubTypeFilter(ALL);
                } else if (
                  !TEXT_TYPE_SUBTYPES[value as TextType].includes(subTypeFilter)
                ) {
                  setSubTypeFilter(ALL);
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              <option value={ALL}>All text types</option>
              {TEXT_TYPE_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-600">
            Sub-type
            <select
              value={subTypeFilter}
              onChange={(event) => setSubTypeFilter(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              <option value={ALL}>All sub-types</option>
              {availableSubTypes.map((subType) => (
                <option key={subType} value={subType}>
                  {subType.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </label>

          {catalogSubjectLinks.length > 0 && (
            <label className="text-sm font-medium text-slate-600">
              Subject links
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              >
                <option value={ALL}>All subjects</option>
                {catalogSubjectLinks.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          )}

          {catalogReadingAges.length > 0 && (
            <label className="text-sm font-medium text-slate-600">
              Reading age
              <select
                value={readingAgeFilter}
                onChange={(event) => setReadingAgeFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              >
                <option value={ALL}>All ages</option>
                {catalogReadingAges.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-500">
            Results are parsed from the Word Bank schema text files bundled with the app.
          </p>
          {hasFiltersApplied && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {filteredCatalog.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No word banks match the current filters. Adjust your search or clear all filters.
            </div>
          ) : (
            filteredCatalog.map((doc) => (
              <details
                key={doc.id}
                className="group rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300"
              >
                <summary className="flex cursor-pointer flex-wrap items-start gap-3 text-left [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-semibold text-slate-900">
                      {doc.meta.topic ?? doc.fileName.replace(/\.txt$/, "")}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {doc.meta.year} - {textTypeLabel(doc.meta.text_type)} - {doc.meta.sub_type.replace(/-/g, " ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{describeHeadings(doc)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
                    <span>File: {doc.fileName}</span>
                    {doc.meta.keywords?.length ? (
                      <span>
                        Keywords: {doc.meta.keywords.slice(0, 3).join(", ")}
                        {doc.meta.keywords.length > 3 ? "..." : ""}
                      </span>
                    ) : null}
                  </div>
                </summary>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Meta
                      </h3>
                      <dl className="space-y-1 text-xs text-slate-600">
                        <div className="flex gap-1">
                          <dt className="font-medium text-slate-700">Subject links:</dt>
                          <dd>
                            {(doc.meta.subject_links ?? []).length
                              ? doc.meta.subject_links.join(", ")
                              : "--"}
                          </dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-slate-700">Reading age:</dt>
                          <dd>{doc.meta.reading_age ?? "--"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-slate-700">Author:</dt>
                          <dd>{doc.meta.author ?? "--"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-slate-700">Version:</dt>
                          <dd>{doc.meta.version ?? "--"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      {doc.headings.map((heading, headingIndex) => (
                        <div key={`${doc.id}-${heading.label}-${headingIndex}`}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {heading.label}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {heading.items.map((item, itemIndex) => (
                              <span
                                key={`${doc.id}-${heading.label}-${itemIndex}`}
                                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                {item.isPhrase ? `[${item.text}]` : item.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500">
                    Ready to put this bank to work? Jump to the assignment
                    builder with it pre-selected.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const payload: CatalogWordBankState = {
                        id: doc.id,
                        fileName: doc.fileName,
                        meta: doc.meta,
                        headings: doc.headings,
                      };
                      navigate("../assignments", {
                        state: { catalogWordBank: payload },
                      });
                    }}
                    className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Assign this bank
                  </button>
                </div>
              </details>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Add custom word bank
        </h2>
        <form
          onSubmit={handleSubmit}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
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
            Topic
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Innovation Project"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value as (typeof categories)[number]["value"],
                )
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
          <label className="md:col-span-2 text-sm font-medium text-slate-600">
            Words (one per line)
            <textarea
              value={items}
              onChange={(event) => setItems(event.target.value)}
              placeholder="prototype&#10;blueprint&#10;feedback"
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
              required
            />
          </label>
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
        <h2 className="text-lg font-semibold text-slate-900">
          Custom bank overview
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {customGroups.map((group) => (
            <div
              key={group.value}
              className="rounded-md border border-slate-200 p-4"
            >
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{group.label}</p>
                <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {group.banks.length}
                </span>
              </div>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {group.banks.length === 0 ? (
                  <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">
                    No custom banks yet.
                  </li>
                ) : (
                  group.banks.map((bank) => (
                    <li key={bank.id} className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="font-medium text-slate-800">{bank.title}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {bank.topic} - {bank.items.length} words
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WordBanksPanel;
