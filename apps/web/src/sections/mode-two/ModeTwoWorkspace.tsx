import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkspaceLayout from "../../layouts/WorkspaceLayout";
import useSpeechSynthesis from "../../hooks/useSpeechSynthesis";
import {
  CORE_WORD_CLASS_KEYS,
  CORE_WORD_CLASS_LABELS,
  type CoreWordClass,
  type ModeTwoBank,
} from "./data";
import { useTeacherStore } from "../../store/useTeacherStore";
import { useWorkspaceSettings } from "../../store/useWorkspaceSettings";
import { type WordBankSnapshot } from "../../services/wordBankCatalog";
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
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

// pdfMake requires the virtual file system to load fonts in the browser bundle.
const pdfMakeWithVfs = pdfMake as typeof pdfMake & { vfs?: Record<string, string> };
const pdfFontsVfs = (pdfFonts as unknown) as Record<string, string>;
pdfMakeWithVfs.vfs = pdfFontsVfs;

// Mode 2 offers a click-to-compose drafting space with adaptive templates and export hooks.
type TopicFilter = "all" | ModeTwoBank["topic"];

const draftStorageKey = "writetogether-mode2-draft";

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

type FilePickerWindow = Window & typeof globalThis & {
  showSaveFilePicker?: (
    options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    },
  ) => Promise<{
    name: string;
    createWritable: () => Promise<{
      write: (data: Blob | BufferSource | string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

const usernameStorageKey = "writetogether-current-username";
const defaultUsername = "Preview Pupil";

const resolveUsername = () => {
  if (typeof window === "undefined") {
    return defaultUsername;
  }
  try {
    const stored = window.localStorage.getItem(usernameStorageKey);
    if (!stored) {
      return defaultUsername;
    }
    return stored.trim() || defaultUsername;
  } catch {
    return defaultUsername;
  }
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sanitizeForPdf = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.body.querySelectorAll("*").forEach((element) => {
    element.removeAttribute("style");
  });
  return doc.body.innerHTML || "";
};

const generatePdfBlob = (definition: TDocumentDefinitions) =>
  new Promise<Blob>((resolve, reject) => {
    try {
      const generator = pdfMake.createPdf(definition);
      generator.getBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to produce PDF blob"));
        }
      });
    } catch (error) {
      reject(error);
    }
  });

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
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);
  const [fontFamily, setFontFamily] = useState<string>(fontOptions[0]);
  const theme = useWorkspaceSettings((state) => state.theme);

  const assignments = useTeacherStore((state) => state.assignments);
  const libraryWordBanks = useTeacherStore((state) => state.wordBanks);
  const addSharedFile = useTeacherStore((state) => state.addSharedFile);
  const exportToastTimerRef = useRef<number | null>(null);
  const { canSpeak, isSpeaking, speak, stop, voices } = useSpeechSynthesis({
    locale: "en-gb",
  });
  const [voiceIndex, setVoiceIndex] = useState(0);
  const hasManualVoiceSelection = useRef(false);
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          bulletList: { keepMarks: true, keepAttributes: true },
          orderedList: { keepMarks: true, keepAttributes: true },
        }),
        Underline,
        TextStyle,
        Placeholder.configure({
          placeholder: "Start your draft...",
        }),
      ],
      content: draftHtml ? draftHtml : "<p></p>",
      onUpdate: ({ editor }) => {
        const nextHtml = editor.isEmpty ? "" : editor.getHTML();
        setDraftHtml((current) => (current === nextHtml ? current : nextHtml));
      },
    },
    [],
  );

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
    if (!editor) {
      return;
    }
    const targetHtml = draftHtml === "" ? "<p></p>" : draftHtml;
    const currentHtml = editor.getHTML();
    if (draftHtml === "" && editor.isEmpty) {
      return;
    }
    if (currentHtml === targetHtml) {
      return;
    }
    editor.commands.setContent(targetHtml, false);
  }, [editor, draftHtml]);

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
    const id = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, draftHtml);
    }, 300);
  return () => window.clearTimeout(id);
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

  const activeWordBankIds = useMemo(
    () => activeAssignment?.wordBankIds ?? [],
    [activeAssignment],
  );

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
  }, [activeAssignment, activeWordBankIds]);

  const themeClassName = theme === "standard" ? "" : `mode-two-theme-${theme}`;
  const themedClass = useCallback(
    (base: string) => (themeClassName ? `${base} ${themeClassName}` : base),
    [themeClassName],
  );

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
    if (!editor) {
      return;
    }
    const insertion = token.endsWith(" ") ? token : `${token} `;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: insertion,
      })
      .run();
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
    stop();
    if (!editor) {
      setDraftHtml("");
      return;
    }
    editor.chain().focus().clearContent(true).run();
  };

  const handleIncreaseFont = () => {
    setFontSize((size) => Math.min(size + 2, 28));
    editor?.chain().focus().run();
  };

  const handleDecreaseFont = () => {
    setFontSize((size) => Math.max(size - 2, 12));
    editor?.chain().focus().run();
  };

  const toggleMark = (mark: "bold" | "italic" | "underline") => {
    if (!editor) {
      return;
    }
    const chain = editor.chain().focus();
    switch (mark) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "underline":
        chain.toggleUnderline().run();
        break;
    }
  };

  const applyListCommand = (ordered: boolean) => {
    if (!editor) {
      return;
    }
    const chain = editor.chain().focus();
    if (ordered) {
      chain.toggleOrderedList().run();
    } else {
      chain.toggleBulletList().run();
    }
  };

  const handleFontChange = (value: string) => {
    setFontFamily(value);
    editor?.chain().focus().run();
  };

  const handleExportPreview = async () => {
    const trimmedContent = plainText.trim();
    if (!trimmedContent) {
      return;
    }
    setExportState("loading");
    setExportMessage("");
    const typedWindow = window as FilePickerWindow;
    let shouldRefocus = false;
    try {
      const now = new Date();
      const defaultNameSeed = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .replace("Z", "");
      const suggestedName = `ModeTwo_${defaultNameSeed}.pdf`;
      let resolvedFilename = suggestedName;
      let fileHandle: Awaited<ReturnType<NonNullable<FilePickerWindow["showSaveFilePicker"]>>> | null =
        null;

      if (typedWindow.showSaveFilePicker) {
        try {
          fileHandle = await typedWindow.showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: "PDF document",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
          const handleNameRaw = fileHandle.name;
          const handleName = handleNameRaw.toLowerCase().endsWith(".pdf")
            ? handleNameRaw
            : `${handleNameRaw}.pdf`;
          resolvedFilename = handleName;
        } catch (pickerError) {
          const isAbort =
            pickerError instanceof DOMException && pickerError.name === "AbortError";
          if (isAbort) {
            setExportState("idle");
            setExportMessage("Export cancelled.");
            return;
          }
        }
      }

      if (!fileHandle) {
        setExportState("error");
        setExportMessage("Save dialog unavailable. Please try again.");
        return;
      }

      shouldRefocus = editor?.isFocused ?? false;
      editor?.commands.blur();

      const username = resolveUsername();
      const horizontalMargin = 48;
      const verticalMargin = 48;
      const exportHtml = (editor?.getHTML() ?? draftHtml).trim();
      const fallbackHtml =
        trimmedContent
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("") || "<p>&nbsp;</p>";
      const sanitizedHtml = sanitizeForPdf(exportHtml || fallbackHtml);
      const pdfContentNodes = htmlToPdfmake(`<div>${sanitizedHtml}</div>`, { window });
      const bodyContent = Array.isArray(pdfContentNodes) ? pdfContentNodes : [pdfContentNodes];
      const wordCount = trimmedContent.split(/\s+/).length;
      const headingTitle = resolvedFilename.replace(/\.pdf$/i, "");

      const docDefinition: TDocumentDefinitions = {
        info: {
          title: headingTitle,
          author: username,
        },
        pageMargins: [horizontalMargin, verticalMargin, horizontalMargin, verticalMargin],
        defaultStyle: {
          fontSize: 11,
          lineHeight: 1.5,
        },
        styles: {
          exportTitle: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 8],
          },
          exportMetaGroup: {
            margin: [0, 0, 0, 12],
          },
          exportMeta: {
            fontSize: 10,
            color: "#475569",
            margin: [0, 0, 0, 2],
          },
          exportFooter: {
            fontSize: 9,
            color: "#64748b",
          },
        },
        content: [
          { text: headingTitle, style: "exportTitle" },
          {
            stack: [
              { text: `Author: ${username}`, style: "exportMeta" },
              { text: `Saved: ${now.toLocaleString()}`, style: "exportMeta" },
              { text: `Word count: ${wordCount}`, style: "exportMeta" },
            ],
            style: "exportMetaGroup",
          },
          { text: "", margin: [0, 4, 0, 4] },
          ...bodyContent,
        ],
        footer: (currentPage, pageCount) => ({
          margin: [horizontalMargin, 12, horizontalMargin, 0],
          columns: [
            { text: "", width: "*" },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: "right",
              style: "exportFooter",
            },
          ],
        }),
      };

      const pdfBlob = await generatePdfBlob(docDefinition);
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
      } catch {
        setExportState("error");
        setExportMessage("We couldn't save the PDF. Please try again.");
        return;
      }

      const savedLocation = `File picker (${resolvedFilename})`;

      const pdfDataUrl = await blobToDataUrl(pdfBlob);

      addSharedFile({
        filename: resolvedFilename,
        username,
        savedAt: now.toISOString(),
        location: savedLocation,
        sizeBytes: pdfBlob.size,
        wordCount,
        dataUrl: pdfDataUrl,
      });

      setExportState("success");
      setExportMessage(`Saved and shared ${resolvedFilename}.`);
      if (exportToastTimerRef.current !== null) {
        window.clearTimeout(exportToastTimerRef.current);
        exportToastTimerRef.current = null;
      }
      setExportToast("File exported and a copy sent to your teacher.");
      exportToastTimerRef.current = window.setTimeout(() => {
        setExportToast(null);
        exportToastTimerRef.current = null;
      }, 3500);
    } catch (error) {
      console.error(error);
      setExportState("error");
      setExportMessage("Export failed. Please try again.");
    } finally {
      if (shouldRefocus) {
        window.setTimeout(() => {
          editor?.commands.focus("end");
        }, 50);
      }
    }
  };

  const settingsMenu = useMemo(() => (
    <div className={themedClass("mode-two-left-menu")}>
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
  ), [availableTopics, setSortMode, sortMode, themedClass, topicFilter, voiceIndex, voices]);

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
            onClick={() => toggleMark("bold")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Bold"
            aria-label="Bold"
            disabled={!editor}
          >
            <img src={iconBold} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={() => toggleMark("italic")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Italic"
            aria-label="Italic"
            disabled={!editor}
          >
            <img src={iconItalic} alt="" className="mode-two-toolbar-icon" />
          </button>
          <button
            type="button"
            onClick={() => toggleMark("underline")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Underline"
            aria-label="Underline"
            disabled={!editor}
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
            disabled={!editor}
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
            disabled={!editor}
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
            disabled={!editor}
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
            disabled={!editor}
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
        <div className="mode-two-editor-surface">
          {exportToast ? (
            <div className="mode-two-export-toast" role="status">
              {exportToast}
            </div>
          ) : null}
          <EditorContent
            editor={editor}
            aria-label="Writing area"
            className="mode-two-editor"
            style={{ fontSize: `${fontSize}px`, fontFamily }}
          />
        </div>
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
  }, [setGlobalMenuContent, settingsMenu]);

  useEffect(() => {
    return () => {
      if (exportToastTimerRef.current !== null) {
        window.clearTimeout(exportToastTimerRef.current);
        exportToastTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => setGlobalMenuContent(null);
  }, [setGlobalMenuContent]);

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
                : "Exports save locally and synchronise with the teacher console instantly."}
          </span>
        </div>
      }
    />
  );
};

export default ModeTwoWorkspace;






























