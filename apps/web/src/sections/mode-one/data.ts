import type { ColourSlot } from "@writetogether/schema";

export type SemanticsChip = {
  id: string;
  label: string;
  slot: ColourSlot;
  prompt?: string;
};

export const slotOrder: ColourSlot[] = [
  "who",
  "doing",
  "what",
  "where",
  "when",
];

export const slotLabels: Record<ColourSlot, string> = {
  who: "Who",
  doing: "Doing",
  what: "What",
  where: "Where",
  when: "When",
};

export const defaultChips: SemanticsChip[] = [
  { id: "c-wh-1", label: "The explorer", slot: "who" },
  { id: "c-wh-2", label: "My teacher", slot: "who" },
  { id: "c-wh-3", label: "Our class", slot: "who" },
  { id: "c-do-1", label: "searched", slot: "doing" },
  { id: "c-do-2", label: "investigated", slot: "doing" },
  { id: "c-do-3", label: "described", slot: "doing" },
  { id: "c-wh-4", label: "The penguin", slot: "who" },
  { id: "c-do-4", label: "slid", slot: "doing" },
  { id: "c-wh-5", label: "Captain Shackleton", slot: "who" },
  { id: "c-what-1", label: "the icy landscape", slot: "what" },
  { id: "c-what-2", label: "the lost map", slot: "what" },
  { id: "c-what-3", label: "new materials", slot: "what" },
  { id: "c-where-1", label: "on the frozen ship", slot: "where" },
  { id: "c-where-2", label: "near the science table", slot: "where" },
  { id: "c-where-3", label: "inside the quiet library", slot: "where" },
  { id: "c-when-1", label: "before sunrise", slot: "when" },
  { id: "c-when-2", label: "after lunch", slot: "when" },
  { id: "c-when-3", label: "during the expedition", slot: "when" },
];
