import type { WordBank } from "@writetogether/schema";

export const CORE_WORD_CLASS_KEYS = [
  "nouns",
  "verbs",
  "adjectives",
  "adverbials",
  "connectives",
  "starters",
] as const;

export type CoreWordClass = (typeof CORE_WORD_CLASS_KEYS)[number];

export const CORE_WORD_CLASS_LABELS: Record<CoreWordClass, string> = {
  nouns: "Nouns",
  verbs: "Verbs",
  adjectives: "Adjectives",
  adverbials: "Adverbials",
  connectives: "Connectives",
  starters: "Sentence Starters",
};

// Demo bank definitions consumed by Mode 2 and the teacher console.
export type ModeTwoBank = WordBank & {
  category: string;
  topic: string;
  categoryLabel?: string;
};

// Samples touch each grammar category so assignment templates feel rich.
export const modeTwoBanks: ModeTwoBank[] = [
  {
    id: "bank-nouns-topic",
    title: "Topic Nouns",
    description: "Key people, places and objects linked to the current class topic",
    level: "lks2",
    tags: ["topic:current", "grammar:noun"],
    colourMap: undefined,
    category: "nouns",
    topic: "Current Topic",
    items: [
      { id: "n1", text: "innovator", tags: ["tier:2"] },
      { id: "n2", text: "blueprint", tags: ["tier:2"] },
      { id: "n3", text: "prototype", tags: ["tier:1"] },
      { id: "n4", text: "workshop", tags: ["tier:1"] },
      { id: "n5", text: "team", tags: ["tier:1"] },
      { id: "n6", text: "experiment", tags: ["tier:1"] },
      { id: "n7", text: "solution", tags: ["tier:1"] },
      { id: "n8", text: "audience", tags: ["tier:1"] },
    ],
  },
  {
    id: "bank-verbs-topic",
    title: "Topic Verbs",
    description: "Action verbs pupils can apply to this term's project work",
    level: "lks2",
    tags: ["topic:current", "grammar:verb"],
    colourMap: undefined,
    category: "verbs",
    topic: "Current Topic",
    items: [
      { id: "v1", text: "designed" },
      { id: "v2", text: "tested" },
      { id: "v3", text: "assembled" },
      { id: "v4", text: "refined" },
      { id: "v5", text: "presented" },
      { id: "v6", text: "evaluated" },
      { id: "v7", text: "celebrated" },
    ],
  },
  {
    id: "bank-adjectives-topic",
    title: "Topic Adjectives",
    description: "Adjectives to add colour and detail to the current focus",
    level: "lks2",
    tags: ["topic:current", "grammar:adjective"],
    colourMap: undefined,
    category: "adjectives",
    topic: "Current Topic",
    items: [
      { id: "a1", text: "imaginative" },
      { id: "a2", text: "resourceful" },
      { id: "a3", text: "collaborative" },
      { id: "a4", text: "vibrant" },
      { id: "a5", text: "detailed" },
      { id: "a6", text: "resilient" },
    ],
  },
  {
    id: "bank-adverbials-time",
    title: "Time Adverbials",
    description: "Sentence starters for chronology",
    level: "lks2",
    tags: ["grammar:adverbial", "function:starter"],
    colourMap: undefined,
    category: "adverbials",
    topic: "General",
    items: [
      { id: "t1", text: "Before dawn," },
      { id: "t2", text: "Later that day," },
      { id: "t3", text: "After several hours," },
      { id: "t4", text: "Moments before impact," },
      { id: "t5", text: "At the same time," },
    ],
  },
  {
    id: "bank-connectives",
    title: "Connectives",
    description: "Join ideas and create cohesion",
    level: "lks2",
    tags: ["grammar:connective"],
    colourMap: undefined,
    category: "connectives",
    topic: "General",
    items: [
      { id: "c1", text: "because" },
      { id: "c2", text: "even though" },
      { id: "c3", text: "so that" },
      { id: "c4", text: "however" },
      { id: "c5", text: "as a result" },
    ],
  },
  {
    id: "bank-starters",
    title: "Sentence Starters",
    description: "Boost variety at paragraph level",
    level: "lks2",
    tags: ["grammar:starter"],
    colourMap: undefined,
    category: "starters",
    topic: "General",
    items: [
      { id: "s1", text: "Cautiously," },
      { id: "s2", text: "With determination," },
      { id: "s3", text: "Without warning," },
      { id: "s4", text: "In the distance," },
      { id: "s5", text: "Surprisingly," },
    ],
  },
];
