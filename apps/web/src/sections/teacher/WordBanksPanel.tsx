import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createTeacherWordBank,
  fetchTeacherWordBanks,
  resolveTeacherProfileId,
  type TeacherWordBank,
} from "../../services/teacherData";

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

// Custom bank builder for teacher-authored banks.
const WordBanksPanel = () => {
  const [teacherBanks, setTeacherBanks] = useState<TeacherWordBank[]>([]);
  const [bankLoadState, setBankLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankFilter, setBankFilter] = useState<"all" | "mine">("all");
  const [teacherProfileId, setTeacherProfileId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("General");
  const [category, setCategory] =
    useState<(typeof categories)[number]["value"]>("nouns");
  const [level, setLevel] =
    useState<(typeof levels)[number]["value"]>("lks2");
  const [items, setItems] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const loadBanks = async () => {
      setBankLoadState("loading");
      setBankError(null);
      try {
        const [banks, profileId] = await Promise.all([
          fetchTeacherWordBanks(),
          resolveTeacherProfileId(),
        ]);
        setTeacherBanks(banks);
        setTeacherProfileId(profileId);
        setBankLoadState("ready");
      } catch (error) {
        console.error(error);
        setTeacherBanks([]);
        setBankLoadState("error");
        setBankError("Unable to load teacher word banks.");
      }
    };

    void loadBanks();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !items.trim()) {
      return;
    }
    const itemLines = items
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const nextPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      level: level as "ks1" | "lks2" | "uks2",
      tags: [`topic:${topic.toLowerCase()}`, `grammar:${category}`],
      colourMap: undefined,
      category,
      topic,
      items: itemLines.map((text) => ({
        text,
        tags: [],
      })),
    };

    createTeacherWordBank(nextPayload)
      .then((created) => {
        setTeacherBanks((prev) => [created, ...prev]);
        setTitle("");
        setTopic("General");
        setItems("");
        setDescription("");
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

  const customGroups = useMemo(() => {
    return categories.map((entry) => ({
      ...entry,
      banks: filteredTeacherBanks.filter((bank) => bank.category === entry.value),
    }));
  }, [filteredTeacherBanks]);

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
              placeholder="prototype\nblueprint\nfeedback"
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
        )}
      </section>
    </div>
  );
};

export default WordBanksPanel;
