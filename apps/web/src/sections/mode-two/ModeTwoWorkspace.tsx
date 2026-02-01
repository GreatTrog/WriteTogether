import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkspaceLayout from "../../layouts/WorkspaceLayout";
import useSpeechSynthesis from "../../hooks/useSpeechSynthesis";
import {
  CORE_WORD_CLASS_KEYS,
  CORE_WORD_CLASS_LABELS,
  type ModeTwoBank,
  type CoreWordClass,
} from "./data";
import { useTeacherStore } from "../../store/useTeacherStore";
import { useWorkspaceSettings } from "../../store/useWorkspaceSettings";
import { type WordBankSnapshot } from "../../services/wordBankCatalog";
import { useGlobalMenu } from "../../components/GlobalMenu";
import useSupabaseSession from "../../hooks/useSupabaseSession";
import { supabase } from "../../services/supabaseClient";
import { stripWordBankBrackets } from "../../utils/wordBankText";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import "./ModeTwoWorkspace.css";
import ModeTwoToolbar from "./ModeTwoToolbar";
import ModeTwoEditorSurface from "./ModeTwoEditorSurface";
import ModeTwoBankPanel from "./ModeTwoBankPanel";
import ModeTwoAlphabeticalPanel from "./ModeTwoAlphabeticalPanel";
import ModeTwoAlphaStrip from "./ModeTwoAlphaStrip";
import ModeTwoSettingsMenu from "./ModeTwoSettingsMenu";
import {
  resolveHeadingCategory,
  resolveCategoryMeta,
  resolveLevelFromYear,
  resolveTopicFromSnapshot,
  type AlphabeticalBucket,
} from "./modeTwoBankUtils";
import useModeTwoExport from "./useModeTwoExport";

// Mode 2 offers a click-to-compose drafting space with adaptive templates and export hooks.
const draftStorageKey = "writetogether-mode2-draft";
const fontOptions = ["Arial", "Century Gothic", "Calibri", "Helvetica", "Verdana"];
const canonicalCategoryOrder = CORE_WORD_CLASS_KEYS;
const canonicalCategoryWeight = canonicalCategoryOrder.reduce<Record<string, number>>(
  (acc, key, index) => {
    acc[key] = index;
    return acc;
  },
  {},
);

const grammarTagMap: Record<string, CoreWordClass> = {
  noun: "nouns",
  nouns: "nouns",
  verb: "verbs",
  verbs: "verbs",
  adjective: "adjectives",
  adjectives: "adjectives",
  adverbial: "adverbials",
  adverbials: "adverbials",
  connective: "connectives",
  connectives: "connectives",
  starter: "starters",
  starters: "starters",
};

const splitMixedBank = (bank: ModeTwoBank): ModeTwoBank[] => {
  if (bank.category !== "mixed") {
    return [bank];
  }
  const grouped = new Map<string, ModeTwoBank["items"]>();
  bank.items.forEach((item) => {
    const grammarTag = item.tags?.find((tag) => tag.startsWith("grammar:"));
    const rawKey = grammarTag ? grammarTag.replace("grammar:", "") : "additional";
    const resolvedKey = grammarTagMap[rawKey] ?? rawKey;
    if (!grouped.has(resolvedKey)) {
      grouped.set(resolvedKey, []);
    }
    grouped.get(resolvedKey)!.push(item);
  });

  return Array.from(grouped.entries()).map(([key, items]) => ({
    ...bank,
    id: `${bank.id}::${key}`,
    category: key,
    categoryLabel:
      Object.prototype.hasOwnProperty.call(CORE_WORD_CLASS_LABELS, key)
        ? CORE_WORD_CLASS_LABELS[key as CoreWordClass]
        : "Additional Words",
    items,
  }));
};

const ModeTwoWorkspace = () => {
  const { user } = useSupabaseSession();
  const isPupilSession =
    Boolean(user) && user?.user_metadata?.role === "pupil";
  const pupilId = user?.user_metadata?.pupil_id as string | undefined;
  const pupilUsername =
    typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : "";

  // Hydrate state from localStorage so drafts, theme, and filters survive reloads.
  const [sortMode, setSortMode] = useState<"class" | "alphabetical">("class");
  const [selectedAssignmentId, setSelectedAssignmentId] =
    useState<string>("general");
  const [draftHtml, setDraftHtml] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(draftStorageKey) ?? "";
  });
  const [drafts, setDrafts] = useState<
    Array<{
      id: string;
      title: string;
      contentHtml: string;
      updatedAt: string;
      archived: boolean;
    }>
  >([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const lastSavedHtmlRef = useRef<string>("");
  const autosaveTimerRef = useRef<number | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);
  const [fontFamily, setFontFamily] = useState<string>(fontOptions[0]);
  const theme = useWorkspaceSettings((state) => state.theme);

  const assignments = useTeacherStore((state) => state.assignments);
  const libraryWordBanks = useTeacherStore((state) => state.wordBanks);
  const addSharedFile = useTeacherStore((state) => state.addSharedFile);
  const [remoteAssignments, setRemoteAssignments] = useState<
    Array<{
      id: string;
      title: string;
      classId: string;
      modeLock: "mode1" | "mode2";
      wordBankIds: string[];
      templateId: string | null;
      dueAt: Date | null;
      settings: {
        wordLimit?: number;
        enableTTS?: boolean;
        slotsEnabled?: Array<"who" | "doing" | "what" | "where" | "when">;
      };
      status: "draft" | "published";
      catalogWordBanks?: Record<string, WordBankSnapshot>;
    }>
  >([]);
  const [remoteBanks, setRemoteBanks] = useState<ModeTwoBank[]>([]);
  const [remoteLoadState, setRemoteLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
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

  const createDraft = useCallback(async () => {
    if (!supabase || !isPupilSession || !pupilId) {
      return;
    }
    const now = new Date();
    const safeName = pupilUsername?.trim() || "Pupil";
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    const title = `${safeName}_${stamp}`;
    const { data, error } = await supabase
      .from("pupil_drafts")
      .insert({
        pupil_id: pupilId,
        title,
        content_html: "",
        content_text: "",
        word_count: 0,
        archived: false,
      })
      .select("id,title,content_html,updated_at,archived")
      .single();
    if (error || !data) {
      setDraftStatus("Unable to create draft.");
      return;
    }
    const entry = {
      id: data.id,
      title: data.title,
      contentHtml: data.content_html ?? "",
      updatedAt: data.updated_at ?? now.toISOString(),
      archived: data.archived ?? false,
    };
    setDrafts((prev) => [entry, ...prev]);
    setActiveDraftId(entry.id);
    setDraftTitle(entry.title);
    setDraftHtml(entry.contentHtml || "<p></p>");
    lastSavedHtmlRef.current = entry.contentHtml || "";
    setDraftStatus("New draft created.");
  }, [isPupilSession, pupilId, pupilUsername]);

  const loadDrafts = useCallback(async () => {
    if (!supabase || !isPupilSession || !pupilId) {
      return;
    }
    setDraftStatus("Loading drafts...");
    const { data, error } = await supabase
      .from("pupil_drafts")
      .select("id,title,content_html,updated_at,archived")
      .eq("pupil_id", pupilId)
      .eq("archived", false)
      .order("updated_at", { ascending: false });

    if (error) {
      setDraftStatus("Unable to load drafts.");
      return;
    }

    const nextDrafts =
      data?.map((entry) => ({
        id: entry.id,
        title: entry.title,
        contentHtml: entry.content_html ?? "",
        updatedAt: entry.updated_at ?? new Date().toISOString(),
        archived: entry.archived ?? false,
      })) ?? [];

    setDrafts(nextDrafts);
    if (nextDrafts.length > 0) {
      const first = nextDrafts[0];
      setActiveDraftId(first.id);
      setDraftTitle(first.title);
      setDraftHtml(first.contentHtml || "<p></p>");
      lastSavedHtmlRef.current = first.contentHtml || "";
      setDraftStatus("Draft loaded.");
    } else {
      setDraftStatus("No drafts yet.");
      await createDraft();
    }
  }, [createDraft, isPupilSession, pupilId]);

  const renameDraft = useCallback(async () => {
    if (!supabase || !activeDraftId) {
      return;
    }
    const nextName = window.prompt("Rename draft:", draftTitle || "My draft");
    if (!nextName) {
      return;
    }
    const trimmed = nextName.trim();
    if (!trimmed) {
      return;
    }
    const { error } = await supabase
      .from("pupil_drafts")
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq("id", activeDraftId);
    if (error) {
      setDraftStatus("Unable to rename draft.");
      return;
    }
    setDraftTitle(trimmed);
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === activeDraftId
          ? { ...draft, title: trimmed }
          : draft,
      ),
    );
  }, [activeDraftId, draftTitle]);

  const deleteDraft = useCallback(async () => {
    if (!supabase || !activeDraftId || !pupilId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this draft permanently? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }
    const { error } = await supabase
      .from("pupil_drafts")
      .delete()
      .eq("id", activeDraftId)
      .eq("pupil_id", pupilId);
    if (error) {
      console.error("Delete draft failed:", error);
      setDraftStatus("Unable to delete draft.");
      return;
    }
    setDrafts((prev) => prev.filter((draft) => draft.id !== activeDraftId));
    setActiveDraftId(null);
    setDraftTitle("");
    setDraftHtml("<p></p>");
    setDraftStatus("Draft deleted.");
    await loadDrafts();
  }, [activeDraftId, loadDrafts, pupilId]);

  const selectDraft = useCallback(
    (id: string) => {
      const next = drafts.find((draft) => draft.id === id);
      if (!next) {
        return;
      }
      setActiveDraftId(next.id);
      setDraftTitle(next.title);
      setDraftHtml(next.contentHtml || "<p></p>");
      lastSavedHtmlRef.current = next.contentHtml || "";
      setDraftStatus("Draft loaded.");
    },
    [drafts],
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

  const { exportState, exportMessage, exportToast, handleExportPreview, handlePrint } =
    useModeTwoExport({
      editor,
      draftHtml,
      plainText,
      addSharedFile,
      draftTitle,
    });

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
    if (!exportToast || !canSpeak) {
      return;
    }
    const selectedVoice = voices[voiceIndex] ?? voices[0];
    speak(exportToast, { voice: selectedVoice, rate: 1 });
  }, [canSpeak, exportToast, speak, voiceIndex, voices]);

  useEffect(() => {
    if (isPupilSession) {
      return;
    }
    const id = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, draftHtml);
    }, 300);
    return () => window.clearTimeout(id);
  }, [draftHtml, isPupilSession]);

  useEffect(() => {
    if (!isPupilSession || !pupilId) {
      return;
    }
    void loadDrafts();
  }, [isPupilSession, pupilId, loadDrafts]);

  useEffect(() => {
    const loadRemoteAssignments = async () => {
      if (!isPupilSession || !supabase || !pupilId) {
        return;
      }
      setRemoteLoadState("loading");
      try {
        const { data: pupilRow, error: pupilError } = await supabase
          .from("pupils")
          .select("class_id, classes(owner_id)")
          .eq("id", pupilId)
          .single();
        if (pupilError || !pupilRow?.class_id) {
          setRemoteAssignments([]);
          setRemoteBanks([]);
          setRemoteLoadState("ready");
          return;
        }
        const classId = pupilRow.class_id as string;
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("assignments")
          .select(
            "id,title,class_id,mode_lock,word_bank_ids,template_id,due_at,settings,status,catalog_word_banks",
          )
          .eq("class_id", classId)
          .order("created_at", { ascending: false });

        if (assignmentError) {
          throw assignmentError;
        }

        const mappedAssignments =
          assignmentRows?.map((row) => ({
            id: row.id,
            title: row.title,
            classId: row.class_id,
            modeLock: row.mode_lock ?? "mode2",
            wordBankIds: row.word_bank_ids ?? [],
            templateId: row.template_id ?? null,
            dueAt: row.due_at ? new Date(row.due_at) : null,
            settings: row.settings ?? {},
            status: row.status ?? "published",
            catalogWordBanks: row.catalog_word_banks ?? undefined,
          })) ?? [];

        setRemoteAssignments(mappedAssignments);

        const assignedBankIds = Array.from(
          new Set(
            mappedAssignments.flatMap((assignment) => assignment.wordBankIds ?? []),
          ),
        );

        if (assignedBankIds.length === 0) {
          setRemoteBanks([]);
          setRemoteLoadState("ready");
          return;
        }

        const { data: bankRows, error: bankError } = await supabase
          .from("word_banks")
          .select(
            "id,title,description,level,tags,colour_map,category,topic,word_bank_items(id,text,slot,tags)",
          )
          .in("id", assignedBankIds)
          .order("created_at", { ascending: false });

        if (bankError) {
          throw bankError;
        }

        const mappedBanks: ModeTwoBank[] =
          bankRows?.map((bank) => ({
            id: bank.id,
            title: bank.title,
            description: bank.description ?? undefined,
            level: bank.level,
            tags: bank.tags ?? [],
            colourMap: bank.colour_map ?? undefined,
            category: bank.category ?? "nouns",
            topic: bank.topic ?? "General",
            items: (bank.word_bank_items ?? []).map((item) => ({
              id: item.id,
              text: item.text,
              tags: item.tags ?? [],
              slot: item.slot ?? undefined,
            })),
          })) ?? [];

        setRemoteBanks(mappedBanks);
        setRemoteLoadState("ready");
      } catch (error) {
        console.warn("Unable to load pupil assignments:", error);
        setRemoteAssignments([]);
        setRemoteBanks([]);
        setRemoteLoadState("error");
      }
    };

    void loadRemoteAssignments();
  }, [isPupilSession, pupilId]);

  useEffect(() => {
    if (!isPupilSession || !activeDraftId || !supabase) {
      return;
    }
    if (draftHtml === lastSavedHtmlRef.current) {
      return;
    }
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(async () => {
      setDraftStatus("Saving...");
      const trimmedText = plainText.trim();
      const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
      const { error } = await supabase
        .from("pupil_drafts")
        .update({
          title: draftTitle || "Untitled",
          content_html: draftHtml,
          content_text: trimmedText,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeDraftId);
      if (error) {
        setDraftStatus("Unable to save.");
        return;
      }
      lastSavedHtmlRef.current = draftHtml;
      setDraftStatus("Saved.");
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === activeDraftId
            ? { ...draft, contentHtml: draftHtml, title: draftTitle || draft.title }
            : draft,
        ),
      );
    }, 1500);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeDraftId, draftHtml, draftTitle, isPupilSession, plainText]);

  const assignmentOptions = useMemo(() => {
    const sourceAssignments = isPupilSession ? remoteAssignments : assignments;
    const modeTwoAssignments = sourceAssignments.filter(
      (assignment) => assignment.modeLock !== "mode1",
    );
    const published = modeTwoAssignments.filter(
      (assignment) => assignment.status === "published",
    );
    const options = (published.length > 0 ? published : modeTwoAssignments).map(
      (assignment) => ({
        value: assignment.id,
        label: assignment.title,
      }),
    );
    return [{ value: "general", label: "General bank" }, ...options];
  }, [assignments, isPupilSession, remoteAssignments]);

  useEffect(() => {
    const hasAssignments = assignmentOptions.length > 1;
    if (!hasAssignments) {
      if (selectedAssignmentId !== "general") {
        setSelectedAssignmentId("general");
      }
      return;
    }
    if (
      selectedAssignmentId !== "general" &&
      assignmentOptions.some((option) => option.value === selectedAssignmentId)
    ) {
      return;
    }
    setSelectedAssignmentId(assignmentOptions[1].value);
  }, [assignmentOptions, selectedAssignmentId]);


  const activeAssignment = useMemo(() => {
    const sourceAssignments = isPupilSession ? remoteAssignments : assignments;
    const modeTwoAssignments = sourceAssignments.filter(
      (assignment) => assignment.modeLock !== "mode1",
    );
    const published = modeTwoAssignments.filter(
      (assignment) => assignment.status === "published",
    );
    const resolved =
      selectedAssignmentId === "general"
        ? null
        : published.find((assignment) => assignment.id === selectedAssignmentId) ??
          published[0] ??
          modeTwoAssignments.find(
            (assignment) => assignment.id === selectedAssignmentId,
          ) ??
          modeTwoAssignments[0] ??
          null;
    return resolved;
  }, [assignments, isPupilSession, remoteAssignments, selectedAssignmentId]);

  const activeWordBankIds = useMemo(() => {
    const assigned = activeAssignment?.wordBankIds ?? [];
    const catalogIds = activeAssignment?.catalogWordBanks
      ? Object.keys(activeAssignment.catalogWordBanks)
      : [];
    return Array.from(new Set([...assigned, ...catalogIds]));
  }, [activeAssignment]);

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
    const baseBanks = isPupilSession ? remoteBanks : libraryWordBanks;
    const assignedIds = new Set(activeAssignment?.wordBankIds ?? []);
    const filtered =
      activeAssignment && assignedIds.size > 0
        ? baseBanks.filter((bank) => assignedIds.has(bank.id))
        : baseBanks;
    const expanded = filtered.flatMap(splitMixedBank);
    return [...catalogCategoryBanks, ...expanded];
  }, [
    activeAssignment,
    catalogCategoryBanks,
    isPupilSession,
    libraryWordBanks,
    remoteBanks,
  ]);

  const filteredBanks = useMemo(() => allCategoryBanks, [allCategoryBanks]);

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
        const trimmed = stripWordBankBrackets(item.text);
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
    const cleaned = stripWordBankBrackets(token);
    const insertion = cleaned.endsWith(" ") ? cleaned : `${cleaned} `;
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

  const settingsMenu = useMemo(
    () => (
      <ModeTwoSettingsMenu
        assignmentOptions={assignmentOptions}
        selectedAssignmentId={selectedAssignmentId}
        onAssignmentChange={(value) => setSelectedAssignmentId(value)}
        sortMode={sortMode}
        onSortModeChange={(mode) => setSortMode(mode)}
        voices={voices}
        voiceIndex={voiceIndex}
        onVoiceChange={(index) => {
          hasManualVoiceSelection.current = true;
          setVoiceIndex(index);
        }}
        themedClass={themedClass}
      />
    ),
    [
      assignmentOptions,
      selectedAssignmentId,
      sortMode,
      themedClass,
      voiceIndex,
      voices,
    ],
  );

  const canvas = (
    <div className="mode-two-canvas-shell">
      <div className={themedClass("mode-two-canvas")}>
        <div className="mode-two-canvas-body">
          {isPupilSession ? (
            <div className="mode-two-draft-bar">
              <div className="mode-two-draft-bar__left">
                <select
                  id="mode-two-file-menu"
                  className="mode-two-draft-action"
                  aria-label="File menu"
                  value=""
                  onChange={(event) => {
                    const action = event.target.value;
                    if (!action) {
                      return;
                    }
                    if (action === "new") {
                      void createDraft();
                    } else if (action === "rename") {
                      void renameDraft();
                    } else if (action === "delete") {
                      void deleteDraft();
                    } else if (action === "send") {
                      void handleExportPreview();
                    } else if (action === "print") {
                      void handlePrint();
                    }
                    event.target.value = "";
                  }}
                  disabled={!activeDraftId}
                >
                  <option value="">File</option>
                  <option value="new">New</option>
                  <option value="rename">Rename</option>
                  <option value="delete">Delete</option>
                  <option value="send">Send to Teacher</option>
                  <option value="print">Print</option>
                </select>
                <select
                  id="mode-two-draft-picker"
                  className="mode-two-select mode-two-draft-select"
                  value={activeDraftId ?? ""}
                  onChange={(event) => selectDraft(event.target.value)}
                >
                  {drafts.map((draft) => (
                    <option key={draft.id} value={draft.id}>
                      {draft.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mode-two-draft-bar__right">
                <span className="mode-two-draft-title">{draftTitle}</span>
                {draftStatus ? (
                  <span className="mode-two-draft-status">{draftStatus}</span>
                ) : null}
              </div>
            </div>
          ) : null}
          <ModeTwoToolbar
            editor={editor}
            fontFamily={fontFamily}
            fontOptions={fontOptions}
            onFontChange={handleFontChange}
            onToggleMark={toggleMark}
            onDecreaseFont={handleDecreaseFont}
            onIncreaseFont={handleIncreaseFont}
            onApplyList={applyListCommand}
          />
          <ModeTwoEditorSurface
            editor={editor}
            fontSize={fontSize}
            fontFamily={fontFamily}
            exportToast={exportToast}
            canSpeak={canSpeak}
            isSpeaking={isSpeaking}
            plainText={plainText}
            exportState={exportState}
            onSpeakDraft={handleSpeakDraft}
            onClearDraft={handleClearDraft}
            onExportPreview={handleExportPreview}
          />
        </div>
      </div>
    </div>
  );

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
    content: (
      <ModeTwoBankPanel
        banks={category.banks}
        onInsertToken={handleInsertToken}
        themedClass={themedClass}
      />
    ),
  }));

  const baseTabs =
    sortMode === "class"
      ? classTabs
      : [
          {
            id: "alphabetical",
            label: "",
            content: (
              <ModeTwoAlphabeticalPanel
                buckets={alphabeticalBuckets}
                activeLetter={activeAlphaLetter}
                onInsertToken={handleInsertToken}
                themedClass={themedClass}
              />
            ),
          },
        ];

  return (
    <WorkspaceLayout
      canvas={canvas}
      tabs={baseTabs}
      hideTabList={sortMode === "alphabetical"}
      headerAccessory={
        sortMode === "alphabetical" ? (
          <ModeTwoAlphaStrip
            letters={alphabeticalLetters}
            activeLetter={activeAlphaLetter}
            availableLetters={alphabeticalLetterSet}
            onSelectLetter={setActiveAlphaLetter}
            themedClass={themedClass}
          />
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






























