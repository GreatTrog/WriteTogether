import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColourSlot } from "@writetogether/schema";
import WorkspaceLayout from "../../layouts/WorkspaceLayout";
import useSpeechSynthesis from "../../hooks/useSpeechSynthesis";
import { useGlobalMenu } from "../../components/GlobalMenu";
import VoiceRecorderControls from "../../components/VoiceRecorderControls";
import { slotLabels, slotOrder, defaultChips } from "./data";

type SlotState = Record<
  ColourSlot,
  {
    enabled: boolean;
    chipId?: string;
  }
>;

type SentencePart = {
  slot: ColourSlot;
  text: string;
};

const storageKey = "writetogether-mode1";

const initialState: SlotState = {
  who: { enabled: true },
  doing: { enabled: true },
  what: { enabled: true },
  where: { enabled: true },
  when: { enabled: false },
};

const punctuationMarks = [
  { symbol: ".", label: "Statement" },
  { symbol: "?", label: "Question" },
  { symbol: "!", label: "Exclamation" },
];

const slotPalette: Record<
  ColourSlot,
  {
    chip: string;
    chipSelected: string;
    slotIdle: string;
    slotSelected: string;
    preview: string;
  }
> = {
  who: {
    chip: "bg-white text-semantics-who border border-semantics-who/50 hover:bg-semantics-who/10",
    chipSelected: "bg-semantics-who text-white shadow-md",
    slotIdle:
      "border border-dashed border-semantics-who/60 bg-white/60 text-semantics-who",
    slotSelected:
      "border border-semantics-who bg-semantics-who/20 text-semantics-who shadow-sm",
    preview: "bg-semantics-who/25 text-semantics-who",
  },
  doing: {
    chip: "bg-white text-semantics-doing border border-semantics-doing/50 hover:bg-semantics-doing/10",
    chipSelected: "bg-semantics-doing text-white shadow-md",
    slotIdle:
      "border border-dashed border-semantics-doing/60 bg-white/60 text-semantics-doing",
    slotSelected:
      "border border-semantics-doing bg-semantics-doing/20 text-semantics-doing shadow-sm",
    preview: "bg-semantics-doing/25 text-semantics-doing",
  },
  what: {
    chip: "bg-white text-semantics-what border border-semantics-what/50 hover:bg-semantics-what/10",
    chipSelected: "bg-semantics-what text-slate-900 shadow-md",
    slotIdle:
      "border border-dashed border-semantics-what/60 bg-white/60 text-semantics-what",
    slotSelected:
      "border border-semantics-what bg-semantics-what/20 text-slate-900 shadow-sm",
    preview: "bg-semantics-what/25 text-slate-900",
  },
  where: {
    chip: "bg-white text-semantics-where border border-semantics-where/50 hover:bg-semantics-where/10",
    chipSelected: "bg-semantics-where text-white shadow-md",
    slotIdle:
      "border border-dashed border-semantics-where/60 bg-white/60 text-semantics-where",
    slotSelected:
      "border border-semantics-where bg-semantics-where/20 text-semantics-where shadow-sm",
    preview: "bg-semantics-where/25 text-semantics-where",
  },
  when: {
    chip: "bg-white text-semantics-when border border-semantics-when/50 hover:bg-semantics-when/10",
    chipSelected: "bg-semantics-when text-white shadow-md",
    slotIdle:
      "border border-dashed border-semantics-when/60 bg-white/60 text-semantics-when",
    slotSelected:
      "border border-semantics-when bg-semantics-when/20 text-semantics-when shadow-sm",
    preview: "bg-semantics-when/25 text-semantics-when",
  },
};

const ModeOneBuilder = () => {
  const { setContent: setGlobalMenuContent } = useGlobalMenu();
  const [slotState, setSlotState] = useState<SlotState>(() => {
    if (typeof window === "undefined") {
      return initialState;
    }

    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return initialState;
    }

    try {
      const parsed = JSON.parse(stored) as {
        slotState: SlotState;
        punctuation: string;
      };
      return { ...initialState, ...parsed.slotState };
    } catch {
      return initialState;
    }
  });
  const [punctuation, setPunctuation] = useState<string>(() => {
    if (typeof window === "undefined") {
      return ".";
    }
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return ".";
    }
    try {
      const parsed = JSON.parse(stored) as {
        slotState: SlotState;
        punctuation: string;
      };
      return parsed.punctuation ?? ".";
    } catch {
      return ".";
    }
  });
  const [draggingChip, setDraggingChip] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<ColourSlot | null>(null);

  const { canSpeak, speak, stop, isSpeaking, voices } = useSpeechSynthesis({
    locale: "en-gb",
  });
  const [voiceIndex, setVoiceIndex] = useState(0);

  useEffect(() => {
    if (voices.length === 0) {
      return;
    }
    const britishVoiceIndex = voices.findIndex((voice) =>
      voice.lang?.toLowerCase().startsWith("en-gb"),
    );
    if (britishVoiceIndex >= 0) {
      setVoiceIndex(britishVoiceIndex);
    }
  }, [voices]);

  const chipsBySlot = useMemo(() => {
    return slotOrder.reduce<Record<ColourSlot, typeof defaultChips>>(
      (acc, slot) => {
        acc[slot] = defaultChips.filter((chip) => chip.slot === slot);
        return acc;
      },
      {
        who: [],
        doing: [],
        what: [],
        where: [],
        when: [],
      },
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ slotState, punctuation }),
    );
  }, [slotState, punctuation]);

  const chipAssignments = useMemo(() => {
    const map = new Map<string, ColourSlot>();
    slotOrder.forEach((slot) => {
      const chipId = slotState[slot].chipId;
      if (chipId) {
        map.set(chipId, slot);
      }
    });
    return map;
  }, [slotState]);

  const { sentenceText, sentenceParts } = useMemo(() => {
    const parts: SentencePart[] = [];
    slotOrder.forEach((slot) => {
      if (!slotState[slot].enabled) {
        return;
      }
      const chipId = slotState[slot].chipId;
      if (!chipId) {
        return;
      }
      const chip = defaultChips.find((item) => item.id === chipId);
      if (!chip) {
        return;
      }
      parts.push({ slot, text: chip.label });
    });

    if (parts.length === 0) {
      return { sentenceText: "", sentenceParts: [] as SentencePart[] };
    }

    const combined = parts
      .map((part) => part.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!combined) {
      return { sentenceText: "", sentenceParts: [] as SentencePart[] };
    }

    const capitalised = combined.charAt(0).toUpperCase() + combined.slice(1);
    return {
      sentenceText: capitalised + punctuation.trim(),
      sentenceParts: parts,
    };
  }, [slotState, punctuation]);

  const handleToggleSlot = (slot: ColourSlot) => {
    setSlotState((prev) => {
      const next = { ...prev };
      const currentlyEnabled = prev[slot].enabled;
      next[slot] = {
        enabled: !currentlyEnabled,
        chipId: !currentlyEnabled ? prev[slot].chipId : undefined,
      };
      return next;
    });
  };

  const handleAssignChip = useCallback((slot: ColourSlot, chipId: string) => {
    setSlotState((prev) => {
      const next: SlotState = {
        who: { ...prev.who },
        doing: { ...prev.doing },
        what: { ...prev.what },
        where: { ...prev.where },
        when: { ...prev.when },
      };

      slotOrder.forEach((existingSlot) => {
        if (next[existingSlot].chipId === chipId) {
          next[existingSlot].chipId = undefined;
        }
      });

      next[slot].chipId =
        prev[slot].chipId === chipId ? undefined : chipId;
      return next;
    });
  }, []);

  const handleClear = () => {
    setSlotState((prev) => ({
      who: { ...prev.who, chipId: undefined },
      doing: { ...prev.doing, chipId: undefined },
      what: { ...prev.what, chipId: undefined },
      where: { ...prev.where, chipId: undefined },
      when: { ...prev.when, chipId: undefined },
    }));
    stop();
  };

  const handleSpeak = () => {
    if (!sentenceText) {
      return;
    }
    speak(sentenceText, { voice: voices[voiceIndex] });
  };

  const handleDropOnSlot = (
    event: React.DragEvent<HTMLButtonElement>,
    slot: ColourSlot,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setHoverSlot(null);
    const droppedId =
      event.dataTransfer.getData("text/plain") || draggingChip || "";
    if (!droppedId) {
      return;
    }
    handleAssignChip(slot, droppedId);
    setDraggingChip(null);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    chipId: string,
  ) => {
    event.dataTransfer.setData("text/plain", chipId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingChip(chipId);
  };

  const handleDragEnd = () => {
    setDraggingChip(null);
    setHoverSlot(null);
  };

  const settingsMenu = useMemo(() => (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      <div>
        <p className="font-semibold text-slate-900">Teacher Controls</p>
        <p className="mt-1 text-xs text-slate-500">
          Toggle slots or guide punctuation to match lesson objectives.
        </p>
      </div>
      <div className="space-y-2">
        {slotOrder.map((slot) => (
          <label
            key={slot}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <span className="text-sm font-medium text-slate-800">
              {slotLabels[slot]}
            </span>
            <input
              type="checkbox"
              checked={slotState[slot].enabled}
              onChange={() => handleToggleSlot(slot)}
              className="h-4 w-4 accent-slate-900"
            />
          </label>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sentence ending
        </p>
        <div className="mt-2 flex gap-2">
          {punctuationMarks.map((mark) => (
            <button
              key={mark.symbol}
              type="button"
              onClick={() => setPunctuation(mark.symbol)}
              className={`flex-1 rounded-md border px-2 py-2 text-sm font-semibold transition ${
                punctuation === mark.symbol
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {mark.symbol}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="mt-auto rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
      >
        Clear sentence
      </button>
    </div>
  ), [handleClear, handleToggleSlot, punctuation, slotState]);
  const slotBoard = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {slotOrder.map((slot) => {
        if (!slotState[slot].enabled) {
          return null;
        }

        const chipId = slotState[slot].chipId;
        const palette = slotPalette[slot];
        const chip = chipId
          ? defaultChips.find((item) => item.id === chipId)
          : undefined;
        const isHovering = hoverSlot === slot && draggingChip;

        return (
          <button
            key={slot}
            type="button"
            draggable={Boolean(chip)}
            onDragStart={(event) => chipId && handleDragStart(event, chipId)}
            onDragEnd={handleDragEnd}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDragEnter={() => setHoverSlot(slot)}
            onDragLeave={() => setHoverSlot(null)}
            onDrop={(event) => handleDropOnSlot(event, slot)}
            onClick={() => chipId && handleAssignChip(slot, chipId)}
            className={`relative min-h-[90px] min-w-[140px] rounded-3xl px-4 py-3 text-left transition ${
              chip ? palette.slotSelected : palette.slotIdle
            } ${isHovering ? "ring-4 ring-offset-2 ring-semantics-who/40" : ""}`}
          >
            <span className="block text-xs font-semibold uppercase tracking-wide">
              {slotLabels[slot]}
            </span>
            <span className="mt-2 block text-sm font-semibold leading-snug">
              {chip ? chip.label : "Drop a piece here"}
            </span>
            <span className="pointer-events-none absolute -bottom-3 left-1/2 h-3 w-6 -translate-x-1/2 rounded-b-full bg-white/70" />
          </button>
        );
      })}
    </div>
  );

  useEffect(() => {
    setGlobalMenuContent(settingsMenu);
    return () => setGlobalMenuContent(null);
  }, [setGlobalMenuContent, settingsMenu]);

  const canvas = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Build your sentence
          </h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Drag puzzle pieces into place from the tabs below
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <VoiceRecorderControls
            orientation="inline"
            size="compact"
            hideStatus
          />
          <button
            type="button"
            onClick={isSpeaking ? stop : handleSpeak}
            disabled={!sentenceText || !canSpeak}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              sentenceText && canSpeak
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {isSpeaking ? "Stop" : "Read aloud"}
          </button>
        </div>
      </div>
      <div
        className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6"
        style={{ minHeight: "180px" }}
      >
        {slotBoard}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sentence preview
        </p>
        {sentenceParts.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-base font-semibold">
            {sentenceParts.map((part, index) => (
              <span
                key={`${part.slot}-${part.text}-${index}`}
                className={`rounded-md px-3 py-1 ${slotPalette[part.slot].preview}`}
              >
                {part.text}
              </span>
            ))}
            <span className="text-slate-800">{punctuation}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Drag the puzzle pieces into the board to build a sentence.
          </p>
        )}
      </div>
    </div>
  );

  const sentencePartsTab = (
    <div className="flex min-h-[160px] gap-4 overflow-x-auto pb-2">
      {slotOrder.map((slot) => {
        if (!slotState[slot].enabled) {
          return null;
        }

        const palette = slotPalette[slot];

        return (
          <div
            key={slot}
            className="flex min-w-[220px] flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {slotLabels[slot]}
            </p>
            <div className="flex flex-wrap gap-2">
              {chipsBySlot[slot].map((chip) => {
                const assignedSlot = chipAssignments.get(chip.id);
                const isSelected = assignedSlot === slot;
                const isDisabled =
                  assignedSlot && assignedSlot !== slot;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    draggable={!isDisabled}
                    onDragStart={(event) => handleDragStart(event, chip.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleAssignChip(slot, chip.id)}
                    disabled={isDisabled}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isSelected ? palette.chipSelected : palette.chip
                    } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <span className="block">{chip.label}</span>
                    <span className="pointer-events-none absolute -right-2 h-4 w-4 rounded-full bg-white/70" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const teacherNotesTab = (
    <div className="flex h-full min-h-[160px] flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">
        Teaching prompts
      </p>
      <ul className="space-y-2 text-sm leading-relaxed">
        <li>- Encourage pupils to rehearse the sentence aloud before pressing "Read aloud".</li>
        <li>- Challenge confident writers by toggling on the "When" slot.</li>
        <li>- Celebrate originality: invite pupils to swap one piece for their own idea.</li>
      </ul>
    </div>
  );

  return (
    <WorkspaceLayout
      canvas={canvas}
      tabs={[
        { id: "chips", label: "Sentence Parts", content: sentencePartsTab },
        { id: "prompts", label: "Teacher Notes", content: teacherNotesTab },
      ]}
      bottomAccessory={
        <p className="text-xs text-slate-500">
          Export note: this sentence becomes the starter text in Mode 2.
        </p>
      }
    />
  );
};

export default ModeOneBuilder;






