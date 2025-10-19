import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import WorkspaceLayout from "../../layouts/WorkspaceLayout";
import useSpeechSynthesis from "../../hooks/useSpeechSynthesis";
import {
  CORE_WORD_CLASS_KEYS,
  CORE_WORD_CLASS_LABELS,
  type CoreWordClass,
  type ModeTwoBank,
} from "./data";
import { useTeacherStore } from "../../store/useTeacherStore";
import {
  textTypeLabel,
  type WordBankSnapshot,
} from "../../services/wordBankCatalog";
import "./ModeTwoWorkspace.css";
import iconBold from "../../assets/icons/Bold.svg";
import iconItalic from "../../assets/icons/Italics.svg";
import iconUnderline from "../../assets/icons/Underline.svg";
import iconFontDecrease from "../../assets/icons/Font_size_down.svg";
import iconFontIncrease from "../../assets/icons/Font_size_up.svg";
import iconListBullets from "../../assets/icons/Bullets.svg";
import iconListNumbered from "../../assets/icons/Numbered_Bullets.svg";
import clsx from "clsx";
import { useGlobalMenu } from "../../components/GlobalMenu";
import VoiceRecorderControls from "../../components/VoiceRecorderControls";

// Mode 2 offers a click-to-compose drafting space with adaptive templates and export hooks.
type TopicFilter = "all" | ModeTwoBank["topic"];

const draftStorageKey = "writetogether-mode2-draft";
const themeStorageKey = "writetogether-mode2-theme";

// Map fuzzy heading labels from catalog imports into the classroom categories.
const headingCategoryMap: Record<string, CoreWordClass> = {
  noun: "nouns",
  nouns: "nouns",
  verb: "verbs",
  verbs: "verbs",
  adjective: "adjectives",
  adjectives: "adjectives",
  adverbial: "adverbials",
  adverbials: "adverbials",
  conjunction: "connectives",
  conjunctions: "connectives",
  connective: "connectives",
  connectives: "connectives",
  sentencestarter: "starters",
  sentencestarters: "starters",
  sentenceopener: "starters",
  sentenceopeners: "starters",
  starters: "starters",
  openings: "starters",
};

const normaliseHeadingLabel = (label: string) =>
  label.toLowerCase().replace(/[^a-z]/g, "");

const canonicalCategoryOrder = CORE_WORD_CLASS_KEYS;
const canonicalCategoryWeight = canonicalCategoryOrder.reduce<Record<string, number>>(
  (acc, key, index) => {
    acc[key] = index;
    return acc;
  },
  {},
);

const ADDITIONAL_CATEGORY_KEY = "additional";
const ADDITIONAL_CATEGORY_LABEL = "Additional Words";

const formatCategoryLabel = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) {
    return ADDITIONAL_CATEGORY_LABEL;
  }
  return trimmed;
};

type CategoryMeta = {
  key: string;
  label: string;
  order: number;
};

const resolveHeadingCategory = (headingLabel: string): CategoryMeta => {
  const normalised = normaliseHeadingLabel(headingLabel);
  const canonicalKey = headingCategoryMap[normalised];
  if (canonicalKey) {
    return {
      key: canonicalKey,
      label: CORE_WORD_CLASS_LABELS[canonicalKey],
      order: canonicalCategoryWeight[canonicalKey],
    };
  }

  const key = normalised.length > 0 ? normalised : ADDITIONAL_CATEGORY_KEY;
  return {
    key,
    label: formatCategoryLabel(headingLabel),
    order: canonicalCategoryOrder.length,
  };
};

const resolveCategoryMeta = (
  categoryKey: string,
  explicitLabel?: string,
): CategoryMeta => {
  if (Object.prototype.hasOwnProperty.call(canonicalCategoryWeight, categoryKey)) {
    const typedKey = categoryKey as CoreWordClass;
    return {
      key: categoryKey,
      label: CORE_WORD_CLASS_LABELS[typedKey],
      order: canonicalCategoryWeight[typedKey],
    };
  }

  const label = formatCategoryLabel(explicitLabel ?? categoryKey);
  return {
    key: categoryKey,
    label,
    order: canonicalCategoryOrder.length,
  };
};

const fontOptions = ["Arial", "Century Gothic", "Calibri", "Helvetica", "Verdana"];

type WorkspaceTheme = "standard" | "dyslexia" | "high-contrast" | "dark";

const themeOptions: Array<{ value: WorkspaceTheme; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "dyslexia", label: "Dyslexia-friendly" },
  { value: "high-contrast", label: "High contrast" },
  { value: "dark", label: "Dark" },
];

type AlphabeticalBucket = {
  letter: string;
  items: Array<{
    id: string;
    text: string;
    bankTitle: string;
    category: ModeTwoBank["category"];
  }>;
};

const resolveLevelFromYear = (
  year: string | undefined,
): ModeTwoBank["level"] => {
  if (!year) {
    return "lks2";
  }
  const upper = year.toUpperCase();
  if (upper.startsWith("Y1") || upper.startsWith("Y2") || upper.startsWith("FS")) {
    return "ks1";
  }
  if (upper.startsWith("Y5") || upper.startsWith("Y6")) {
    return "uks2";
  }
  return "lks2";
};

const resolveTopicFromSnapshot = (snapshot: WordBankSnapshot): string => {
  if (snapshot.meta.topic?.trim()) {
    return snapshot.meta.topic.trim();
  }
  const fallback = snapshot.meta.sub_type.replace(/-/g, " ").trim();
  if (fallback.length > 0) {
    return fallback;
  }
  return snapshot.fileName.replace(/\.txt$/, "").replace(/[_-]+/g, " ").trim();
};

type AnalysisResult = {
  missingCapital: boolean;
  missingPunctuation: boolean;
  readingLevel: number;
};

// Lightweight checks surface quick wins for self-editing feedback.
const analyseText = (text: string): AnalysisResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      missingCapital: false,
      missingPunctuation: false,
      readingLevel: 0,
    };
  }

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const missingCapital = sentences.some(
    (sentence) => sentence.length > 0 && !/^[A-Z]/.test(sentence),
  );
  const missingPunctuation = sentences.length > 0 && !/[.!?]$/.test(trimmed);

  const averageSentenceLength =
    sentences.length > 0 ? trimmed.length / sentences.length : trimmed.length;

  return {
    missingCapital,
    missingPunctuation,
    readingLevel: Number(averageSentenceLength.toFixed(1)),
  };
};

const ModeTwoWorkspace = () => {
  // Hydrate state from localStorage so drafts, theme, and filters survive reloads.
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
  const [sortMode, setSortMode] = useState<"class" | "alphabetical">("class");
  const [draftHtml, setDraftHtml] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(draftStorageKey) ?? "";
  });
  const [exportState, setExportState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [exportMessage, setExportMessage] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(16);
  const [fontFamily, setFontFamily] = useState<string>(fontOptions[0]);
  const [theme, setTheme] = useState<WorkspaceTheme>("standard");

  const assignments = useTeacherStore((state) => state.assignments);
  const libraryWordBanks = useTeacherStore((state) => state.wordBanks);

  const draftRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const { canSpeak, isSpeaking, speak, stop, voices } = useSpeechSynthesis({
    locale: "en-gb",
  });
  const [voiceIndex, setVoiceIndex] = useState(0);
  const hasManualVoiceSelection = useRef(false);
  const hasLoadedTheme = useRef(false);

  const plainText = useMemo(() => {
    if (!draftHtml) {
      return "";
    }
    if (typeof window === "undefined") {
      return draftHtml.replace(/<[^>]*>/g, " ");
    }
    const container = document.createElement("div");
    container.innerHTML = draftHtml;
  return (container.textContent ?? "").replace(/\u00a0/g, " ");
  }, [draftHtml]);

  useEffect(() => {
    if (!voices.length) {
      return;
    }
    const preferredName = "microsoft ryan online (natural)";
    const preferredIndex = voices.findIndex((voice) =>
      voice.name?.toLowerCase().includes(preferredName),
    );
    const localBritishIndex = voices.findIndex(
      (voice) =>
        voice.localService && voice.lang?.toLowerCase().startsWith("en-gb"),
    );
    const britishVoice = voices.findIndex((voice) =>
      voice.lang?.toLowerCase().startsWith("en-gb"),
    );
    const resolvedIndex =
      preferredIndex >= 0
        ? preferredIndex
        : localBritishIndex >= 0
          ? localBritishIndex
          : britishVoice >= 0
            ? britishVoice
            : 0;

    if (!hasManualVoiceSelection.current || !voices[voiceIndex]) {
      setVoiceIndex(resolvedIndex);
    }
  }, [voices, voiceIndex]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(themeStorageKey);
    if (
      stored === "standard" ||
      stored === "dyslexia" ||
      stored === "high-contrast" ||
      stored === "dark"
    ) {
      setTheme(stored);
    }
    hasLoadedTheme.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedTheme.current) {
      return;
    }
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, draftHtml);
    }, 300);
  return () => window.clearTimeout(id);
  }, [draftHtml]);

  useEffect(() => {
    const node = draftRef.current;
    if (!node) {
      return;
    }
    if (node.innerHTML !== draftHtml) {
      node.innerHTML = draftHtml || "";
    }
  }, [draftHtml]);

  const activeAssignment = useMemo(() => {
    const modeTwoAssignments = assignments.filter(
      (assignment) => assignment.modeLock !== "mode1",
    );
    const published = modeTwoAssignments.find(
      (assignment) => assignment.status === "published",
    );
    return published ?? modeTwoAssignments[0] ?? null;
  }, [assignments]);

  const activeWordBankIds = activeAssignment?.wordBankIds ?? [];

  const assignedCatalogBanks = useMemo(() => {
    if (!activeAssignment) {
      return [];
    }
    const catalogMap = activeAssignment.catalogWordBanks ?? {};
    return activeWordBankIds
      .map((id) => {
        const snapshot = catalogMap[id];
        if (!snapshot) {
          return null;
        }
        return { id, snapshot };
      })
      .filter(
        (entry): entry is { id: string; snapshot: WordBankSnapshot } =>
          Boolean(entry),
      );
  }, [activeAssignment]);

  const assignedLibraryBanks = useMemo(() => {
    if (!activeAssignment) {
      return [];
    }
    return activeWordBankIds
      .map((id) => libraryWordBanks.find((bank) => bank.id === id))
      .filter((bank): bank is ModeTwoBank => Boolean(bank));
  }, [activeAssignment, libraryWordBanks, activeWordBankIds]);

  const assignmentDueDate = activeAssignment?.dueAt
    ? new Date(activeAssignment.dueAt)
    : null;
  const assignmentBankCount = activeWordBankIds.length;

  const topicFilterLabel =
    topicFilter === "all"
      ? "All topics"
      : topicFilter.charAt(0).toUpperCase() + topicFilter.slice(1);
  const sortLabel =
    sortMode === "class" ? "Word class view" : "Alphabetical view";

  const themeClassName = theme === "standard" ? "" : `mode-two-theme-${theme}`;
  const themedClass = (base: string) =>
    themeClassName ? `${base} ${themeClassName}` : base;

  const catalogCategoryBanks = useMemo<ModeTwoBank[]>(() => {
    if (assignedCatalogBanks.length === 0) {
      return [];
    }

    return assignedCatalogBanks.flatMap(({ snapshot }) => {
        const topic = resolveTopicFromSnapshot(snapshot);
        const level = resolveLevelFromYear(snapshot.meta.year);

        return snapshot.headings.map((heading, headingIndex) => {
          const categoryMeta = resolveHeadingCategory(heading.label);
          const bankId = `catalog::${snapshot.id}::${headingIndex}`;
          const title =
            heading.label.trim().length > 0
              ? `${topic} ${heading.label}`.trim()
              : topic;

          return {
            id: bankId,
            title,
            description: `Imported from catalog (${snapshot.fileName})`,
            level,
            tags: [
              "source:catalog",
              `year:${snapshot.meta.year}`,
              `topic:${topic.toLowerCase().replace(/\s+/g, "-")}`,
            ],
            colourMap: undefined,
            category: categoryMeta.key,
            categoryLabel: categoryMeta.label,
            topic,
            items: heading.items.map((item, itemIndex) => ({
              id: `${bankId}::${itemIndex}`,
              text: item.text,
              tags: [
                "source:catalog",
                item.isPhrase ? "phrase" : undefined,
              ].filter(Boolean) as string[],
            })),
          } as ModeTwoBank;
        });
      });
  }, [assignedCatalogBanks]);

  const allCategoryBanks = useMemo(() => {
    return [...catalogCategoryBanks, ...libraryWordBanks];
  }, [catalogCategoryBanks, libraryWordBanks]);

  const availableTopics = useMemo(() => {
    const topics = new Set<ModeTwoBank["topic"]>();
    allCategoryBanks.forEach((bank) => topics.add(bank.topic));
    return ["all", ...Array.from(topics)] as TopicFilter[];
  }, [allCategoryBanks]);

  useEffect(() => {
    if (
      topicFilter !== "all" &&
      !allCategoryBanks.some((bank) => bank.topic === topicFilter)
    ) {
      setTopicFilter("all");
    }
  }, [allCategoryBanks, topicFilter]);

  const filteredBanks = useMemo(() => {
    return allCategoryBanks.filter((bank) => {
      if (topicFilter !== "all" && bank.topic !== topicFilter) {
        return false;
      }
      return true;
    });
  }, [allCategoryBanks, topicFilter]);

  const groupedCategories = useMemo(() => {
    // Re-shape stored banks so each toolbar tab renders instantly.
    const map = new Map<string, { label: string; order: number; banks: ModeTwoBank[] }>();

    filteredBanks.forEach((bank) => {
      const meta = resolveCategoryMeta(bank.category, bank.categoryLabel);
      const existing = map.get(meta.key);
      if (existing) {
        existing.banks.push(bank);
        return;
      }
      map.set(meta.key, { label: meta.label, order: meta.order, banks: [bank] });
    });

    const result = Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        label: value.label,
        order: value.order,
        banks: value.banks,
      }))
      .sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.label.localeCompare(b.label);
      });

    if (result.length === 0) {
      return canonicalCategoryOrder.map((key) => ({
        key,
        label: CORE_WORD_CLASS_LABELS[key],
        order: canonicalCategoryWeight[key],
        banks: [],
      }));
    }

    return result;
  }, [filteredBanks]);

  const alphabeticalBuckets = useMemo<AlphabeticalBucket[]>(() => {
    // Provide an alternative alphabetical browse when teachers prefer long lists.
    const bucketMap = new Map<string, AlphabeticalBucket>();

    filteredBanks.forEach((bank) => {
      bank.items.forEach((item) => {
        const trimmed = item.text.trim();
        if (!trimmed) {
          return;
        }
        const firstChar = trimmed[0];
        const letterMatch = firstChar.match(/[A-Za-z]/);
        const letter = letterMatch ? letterMatch[0].toUpperCase() : "#";
        if (!bucketMap.has(letter)) {
          bucketMap.set(letter, {
            letter,
            items: [],
          });
        }
        bucketMap.get(letter)!.items.push({
          id: item.id,
          text: trimmed,
          bankTitle: bank.title,
          category: bank.category,
        });
      });
    });

    return Array.from(bucketMap.values())
      .map((bucket) => ({
        ...bucket,
        items: bucket.items.sort((a, b) => a.text.localeCompare(b.text)),
      }))
      .sort((a, b) => {
        if (a.letter === "#") {
          return 1;
        }
        if (b.letter === "#") {
          return -1;
        }
        return a.letter.localeCompare(b.letter);
      });
  }, [filteredBanks]);


  const handleInsertToken = (token: string) => {
    const insertion = token.endsWith(" ") ? token : `${token} `;
    insertTextAtSelection(insertion);
  };

  const handleSpeakDraft = () => {
    if (isSpeaking) {
      stop();
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    const textToSpeak = selectedText && selectedText.length > 0 ? selectedText : plainText;
    const trimmed = textToSpeak.trim();
    if (!trimmed) {
      return;
    }

    const selectedVoice = voices[voiceIndex] ?? voices[0];
    speak(trimmed, { voice: selectedVoice, rate: 1 });
  };

  const handleClearDraft = () => {
    setDraftHtml("");
    stop();
    if (draftRef.current) {
      draftRef.current.innerHTML = "";
    }
    savedRangeRef.current = null;
  };

  const handleIncreaseFont = () => {
    setFontSize((size) => Math.min(size + 2, 28));
    saveSelection();
  };

  const handleDecreaseFont = () => {
    setFontSize((size) => Math.max(size - 2, 12));
    saveSelection();
  };

  const saveSelection = () => {
    if (typeof window === "undefined") {
      return;
    }
    const selection = window.getSelection();
    const editor = draftRef.current;
    if (!selection || selection.rangeCount === 0 || !editor) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }
    savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    if (typeof window === "undefined") {
      return;
    }
    const selection = window.getSelection();
    const editor = draftRef.current;
    if (!selection || !editor) {
      return;
    }
    selection.removeAllRanges();
    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
  };

  const focusEditor = () => {
    const node = draftRef.current;
    if (!node) {
      return;
    }
    node.focus({ preventScroll: true });
    restoreSelection();
  };

  const syncDraftFromDom = () => {
    const node = draftRef.current;
    if (!node) {
      return;
    }
    setDraftHtml(node.innerHTML);
  };

  const execFormattingCommand = (command: string, value?: string) => {
    if (typeof document === "undefined") {
      return;
    }
    focusEditor();
    const success = document.execCommand(command, false, value ?? "");
    if (!success) {
      syncDraftFromDom();
    } else {
      syncDraftFromDom();
    }
    saveSelection();
  };

  const applyListCommand = (ordered: boolean) => {
    if (typeof document === "undefined") {
      return;
    }
    focusEditor();
    const command = ordered ? "insertOrderedList" : "insertUnorderedList";
    const success = document.execCommand(command, false, undefined);
    if (!success) {
      const selection = window.getSelection();
      const editor = draftRef.current;
      if (!selection || !editor || selection.rangeCount === 0) {
        return;
      }
      const range = selection.getRangeAt(0);
      const listTag = ordered ? "ol" : "ul";
      const list = document.createElement(listTag);
      if (selection.isCollapsed) {
        const li = document.createElement("li");
        li.innerHTML = "&nbsp;";
        list.appendChild(li);
        range.insertNode(list);
        const newRange = document.createRange();
        newRange.selectNodeContents(li);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      } else {
        const text = selection
          .toString()
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        range.deleteContents();
        text.forEach((line) => {
          const li = document.createElement("li");
          li.textContent = line;
          list.appendChild(li);
        });
        if (!list.childNodes.length) {
          const li = document.createElement("li");
          li.innerHTML = "&nbsp;";
          list.appendChild(li);
        }
        range.insertNode(list);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(list);
        selection.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }
    } else {
      saveSelection();
    }
    syncDraftFromDom();
    saveSelection();
  };

  const insertTextAtSelection = (text: string) => {
    if (typeof document === "undefined") {
      return;
    }
    focusEditor();
    const success = document.execCommand("insertText", false, text);
    if (!success) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
      } else if (draftRef.current) {
        draftRef.current.append(document.createTextNode(text));
        const range = document.createRange();
        range.selectNodeContents(draftRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRangeRef.current = range.cloneRange();
      }
    }
    syncDraftFromDom();
    saveSelection();
  };

  const handleEditorInput = (event: FormEvent<HTMLDivElement>) => {
    setDraftHtml(event.currentTarget.innerHTML);
    saveSelection();
  };

  const handleFontChange = (value: string) => {
    setFontFamily(value);
    execFormattingCommand("fontName", value);
  };

  const handleExportPreview = async () => {
    if (!plainText.trim()) {
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";
    setExportState("loading");
    setExportMessage("");
    try {
      const response = await fetch(`${apiBase}/exports/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: plainText }),
      });
      if (!response.ok) {
        throw new Error("Failed to queue export");
      }
      const payload = await response.json();
      setExportState("success");
      setExportMessage(
        `Queued export (${payload.wordCount} words). Check the teacher console for the download link.`,
      );
    } catch {
      setExportState("error");
      setExportMessage(
        "Export service unavailable. Is the API server running on port 4000?",
      );
    }
  };

  const settingsMenu = useMemo(() => (
    <div className={themedClass("mode-two-left-menu")}>
      <label className="mode-two-topic-label">
        Colour mode
        <select
          value={theme}
          onChange={(event) => setTheme(event.target.value as WorkspaceTheme)}
          className="mode-two-select"
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mode-two-topic-label">
        Topic focus
        <select
          value={topicFilter}
          onChange={(event) => setTopicFilter(event.target.value as TopicFilter)}
          className="mode-two-select"
        >
          {availableTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic === "all" ? "All topics" : topic}
            </option>
          ))}
        </select>
      </label>
      <div className="mode-two-sort">
        <p className="mode-two-sort-title">Display order</p>
        <div className="mode-two-sort-group">
          <button
            type="button"
            onClick={() => setSortMode("class")}
            className={`mode-two-sort-button${sortMode === "class" ? " is-active" : ""}`}
          >
            Word class
          </button>
          <button
            type="button"
            onClick={() => setSortMode("alphabetical")}
            className={`mode-two-sort-button${sortMode === "alphabetical" ? " is-active" : ""}`}
          >
            Alphabetical
          </button>
        </div>
      </div>
      {voices.length > 0 ? (
        <label className="mode-two-topic-label">
          Voice
          <select
            value={voiceIndex}
            onChange={(event) => {
              hasManualVoiceSelection.current = true;
              setVoiceIndex(Number(event.target.value));
            }}
            className="mode-two-select"
          >
            {voices.map((voice, index) => (
              <option key={voice.name} value={index}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="mode-two-autosave">
        Autosave runs every few seconds. Encourage pupils to read back after
        each paragraph.
      </div>
    </div>
  ), [availableTopics, sortMode, theme, themeOptions, topicFilter, voiceIndex, voices]);

  const canvas = (
    <div className="mode-two-canvas-shell">
      <div className={themedClass("mode-two-canvas")}>
        <div className="mode-two-canvas-body">
          <div className="mode-two-toolbar">
            <select
              value={fontFamily}
              onChange={(event) => handleFontChange(event.target.value)}
              className="mode-two-select mode-two-toolbar-select"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => execFormattingCommand("bold")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Bold"
            aria-label="Bold"
          >
            <img src={iconBold} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={() => execFormattingCommand("italic")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Italic"
            aria-label="Italic"
          >
            <img src={iconItalic} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={() => execFormattingCommand("underline")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Underline"
            aria-label="Underline"
          >
            <img src={iconUnderline} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={handleDecreaseFont}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            <img src={iconFontDecrease} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={handleIncreaseFont}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Increase font size"
            aria-label="Increase font size"
          >
            <img src={iconFontIncrease} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={() => applyListCommand(false)}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Bulleted list"
            aria-label="Bulleted list"
          >
            <img src={iconListBullets} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={() => applyListCommand(true)}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Numbered list"
            aria-label="Numbered list"
          >
            <img src={iconListNumbered} alt="" className="mode-two-toolbar-icon" />
          </button>
          <VoiceRecorderControls
            orientation="inline"
            hideStatus
            showButtonLabels={false}
            useDefaultButtonStyles={false}
            buttonClassName="mode-two-toolbar-button"
            iconClassName="mode-two-toolbar-icon"
          />
        </div>
        <div
          ref={draftRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Writing area"
          onInput={handleEditorInput}
          onBlur={() => {
            syncDraftFromDom();
            saveSelection();
          }}
          onFocus={restoreSelection}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          style={{ fontSize: `${fontSize}px`, fontFamily }}
          className="mode-two-editor"
        />
        <div className="mode-two-action-bar">
            <button
              type="button"
              onClick={handleSpeakDraft}
              disabled={!canSpeak || !plainText.trim()}
              className={`mode-two-action-button mode-two-action-button--speak${
                !canSpeak || !plainText.trim() ? " is-disabled" : ""
              }`}
            >
              {isSpeaking ? "Stop" : "Read back"}
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="mode-two-action-button mode-two-action-button--clear"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleExportPreview}
              disabled={exportState === "loading" || !plainText.trim()}
              className={`mode-two-action-button mode-two-action-button--export${
                exportState === "loading" || !plainText.trim()
                  ? " is-disabled"
                  : ""
              }`}
            >
              {exportState === "loading" ? "Exporting..." : "Export preview"}
            </button>
        </div>
      </div>
    </div>
  </div>
  );

  const makeBankPanel = (banks: ModeTwoBank[]) => {
    if (banks.length === 0) {
    return (
        <div className={themedClass("mode-two-empty")}>
          No words match the current filters.
        </div>
      );
    }

  return (
      <div className={themedClass("mode-two-bank-strip")}>
        {banks.map((bank) => {
          const categoryMeta = resolveCategoryMeta(bank.category, bank.categoryLabel);
          return (
            <div
              key={bank.id}
              className="mode-two-bank-card"
            >
              <div className="mode-two-bank-card__header">
                <div>
                  <p className="mode-two-bank-card__title">
                    {bank.title}
                  </p>
                  <p className="mode-two-bank-card__meta">
                    {categoryMeta.label} - {bank.topic}
                  </p>
                </div>
                <span className="mode-two-chip">
                  {bank.items.length}
                </span>
              </div>
              <div className="mode-two-token-list">
                {bank.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleInsertToken(item.text)}
                    className="mode-two-token"
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const makeAlphabeticalPanel = (buckets: AlphabeticalBucket[]) => {
    if (buckets.length === 0) {
      return (
        <div className={themedClass("mode-two-empty")}>
          No words match the current filters.
        </div>
      );
    }

    const activeBucket =
      (activeAlphaLetter && buckets.find((bucket) => bucket.letter === activeAlphaLetter)) ??
      buckets[0];

    if (!activeBucket) {
      return (
        <div className={themedClass("mode-two-empty")}>
          No words match the current filters.
        </div>
      );
    }

    return (
      <div
        key={activeBucket.letter}
        id={`alpha-${activeBucket.letter}`}
        className={themedClass("mode-two-alpha-card")}
      >
        <div className="mode-two-bank-card__header">
          <p className="mode-two-bank-card__title">{activeBucket.letter}</p>
          <span className="mode-two-chip">{activeBucket.items.length}</span>
        </div>
        <div className="mode-two-alpha-grid">
          {activeBucket.items.map((item) => (
            <button
              key={`${activeBucket.letter}-${item.id}`}
              type="button"
              onClick={() => handleInsertToken(item.text)}
              className="mode-two-token"
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCatalogBankCard = (entry: { id: string; snapshot: WordBankSnapshot }) => {
    const bank = entry.snapshot;
    const headingCount = bank.headings.reduce(
      (sum, heading) => sum + heading.items.length,
      0,
    );
  return (
      <div
        key={entry.id}
        className={themedClass("mode-two-catalog-card")}
      >
        <div className="mode-two-catalog-heading">
          <div>
            <p className="mode-two-catalog-title">
              {bank.meta.topic ?? bank.fileName.replace(/\.txt$/, "")}
            </p>
            <p className="mode-two-catalog-meta">
              {bank.meta.year} - {textTypeLabel(bank.meta.text_type)} -{" "}
              {bank.meta.sub_type.replace(/-/g, " ")}
            </p>
          </div>
          <span className="mode-two-chip">
            {headingCount} entries
          </span>
        </div>
        <div className="mode-two-catalog-list">
          {bank.headings.map((heading) => (
            <div key={`${entry.id}-${heading.label}`}>
              <p className="mode-two-catalog-subheading">
                {heading.label}
              </p>
              <div className="mode-two-catalog-items">
                {heading.items.map((item, index) => (
                  <button
                    key={`${heading.label}-${item.text}-${index}`}
                    type="button"
                    onClick={() => handleInsertToken(item.text)}
                    className="mode-two-token"
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const alphabeticalLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const { setContent: setGlobalMenuContent } = useGlobalMenu();
  const alphabeticalLetterSet = useMemo(() => {
    return new Set(alphabeticalBuckets.map((bucket) => bucket.letter));
  }, [alphabeticalBuckets]);

  const firstAvailableLetter = useMemo(() => {
    const firstBucket = alphabeticalBuckets[0];
    return firstBucket ? firstBucket.letter : null;
  }, [alphabeticalBuckets]);

  const [activeAlphaLetter, setActiveAlphaLetter] = useState<string | null>(firstAvailableLetter);

  useEffect(() => {
    setGlobalMenuContent(settingsMenu);
    return () => setGlobalMenuContent(null);
  }, [setGlobalMenuContent, settingsMenu]);

  useEffect(() => {
    if (sortMode === "alphabetical") {
      setActiveAlphaLetter((current) => {
        if (current && alphabeticalLetterSet.has(current)) {
          return current;
        }
        return firstAvailableLetter;
      });
    }
  }, [sortMode, firstAvailableLetter, alphabeticalLetterSet]);

  useEffect(() => {
    if (sortMode !== "alphabetical") {
      setActiveAlphaLetter(null);
    }
  }, [sortMode]);
  const classTabs = groupedCategories.map((category) => ({
    id: category.key,
    label: category.label,
    content: makeBankPanel(category.banks),
  }));

  const baseTabs =
    sortMode === "class"
      ? classTabs
      : [
          {
            id: "alphabetical",
            label: "",
            content: makeAlphabeticalPanel(alphabeticalBuckets),
          },
        ];

  return (
    <WorkspaceLayout
      canvas={canvas}
      tabs={baseTabs}
      hideTabList={sortMode === "alphabetical"}
      headerAccessory={
        sortMode === "alphabetical" ? (
            <div className={themedClass("mode-two-alpha-strip")}>
              {alphabeticalLetters.map((letter) => {
                const isAvailable = alphabeticalLetterSet.has(letter);
                const isActive = activeAlphaLetter === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    className={clsx(
                      "mode-two-alpha-link",
                      isActive && isAvailable && "mode-two-alpha-link--active",
                    )}
                    disabled={!isAvailable}
                    onClick={() => {
                      if (!isAvailable) {
                        return;
                      }
                      setActiveAlphaLetter(letter);
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
        ) : null
      }
      bottomAccessory={
        <div className={themedClass("mode-two-bottom-bar")}>
          <span>
            Autosave ready  -{" "}
            {plainText.trim().split(/\s+/).filter(Boolean).length} words captured
          </span>
          <span>
            {exportState === "success" && exportMessage
              ? exportMessage
              : exportState === "error"
                ? exportMessage
                : "Exports appear in the teacher console once prepared."}
          </span>
        </div>
      }
    />
  );
};

export default ModeTwoWorkspace;





















