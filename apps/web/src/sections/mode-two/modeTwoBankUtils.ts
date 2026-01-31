import {
  CORE_WORD_CLASS_KEYS,
  CORE_WORD_CLASS_LABELS,
  type CoreWordClass,
  type ModeTwoBank,
} from "./data";
import { type WordBankSnapshot } from "../../services/wordBankCatalog";

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

export type CategoryMeta = {
  key: string;
  label: string;
  order: number;
};

export type AlphabeticalBucket = {
  letter: string;
  items: Array<{
    id: string;
    text: string;
    bankTitle: string;
    category: ModeTwoBank["category"];
  }>;
};

export const resolveHeadingCategory = (headingLabel: string): CategoryMeta => {
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

export const resolveCategoryMeta = (
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

export const resolveLevelFromYear = (
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

export const resolveTopicFromSnapshot = (snapshot: WordBankSnapshot): string => {
  if (snapshot.meta.topic?.trim()) {
    return snapshot.meta.topic.trim();
  }
  const fallback = snapshot.meta.sub_type.replace(/-/g, " ").trim();
  if (fallback.length > 0) {
    return fallback;
  }
  return snapshot.fileName.replace(/\.txt$/, "").replace(/[_-]+/g, " ").trim();
};
