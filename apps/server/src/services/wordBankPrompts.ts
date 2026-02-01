type WordBankPromptInput = {
  mode: "mode1" | "mode2";
  prompt: string;
  title?: string;
  subjectLink?: string;
  yearGroup?: string;
  textType?: string;
  subType?: string;
  readingAge?: string;
  keywords?: string[];
  author?: string;
  version?: string;
  strict?: boolean;
};

const defaultMeta = (input: WordBankPromptInput) => ({
  year: input.yearGroup ?? "Y3",
  textType: input.textType ?? (input.mode === "mode1" ? "narrative" : "non-narrative"),
  subType:
    input.subType ?? (input.mode === "mode1" ? "narrative-stories" : "reports"),
  topic: input.title ?? "Classroom Topic",
  subject: input.subjectLink ?? "English",
  keywords: input.keywords?.length ? input.keywords.join(", ") : "classroom, writing",
  readingAge: input.readingAge ?? "7-8",
  author: input.author ?? "AI",
  version: input.version ?? "1",
});

export const buildWordBankPrompt = (input: WordBankPromptInput) => {
  const meta = defaultMeta(input);
  const required =
    input.mode === "mode1"
      ? "Who, Doing, What, Where, When"
      : "Nouns, Verbs, Adjectives, Adverbials, Connectives, SentenceStarters";

  const modeOneGuidance = [
    "Mode 1 guidance:",
    "- Each item must be a usable sentence part on its own.",
    "- Parts should combine to form complete sentences without adding extra words.",
    "- Avoid single unrelated words; use short phrases where needed.",
    "- Example sentence: [My dog] [caught] [the frisbee] [in his mouth] [when we were at the park].",
    "- Ensure variety so multiple sensible combinations are possible.",
  ];

  const header = [
    "You are generating a WriteTogether word bank in plain text.",
    "Return only the word bank text. No markdown, no bullets, no code fences.",
    "Follow the Meta block and heading format exactly.",
    "",
    "Meta",
    `year: ${meta.year}`,
    `text_type: ${meta.textType}`,
    `sub_type: ${meta.subType}`,
    `topic: ${meta.topic}`,
    `subject_links: ${meta.subject}`,
    `keywords: ${meta.keywords}`,
    `reading_age: ${meta.readingAge}`,
    `author: ${meta.author}`,
    `version: ${meta.version}`,
    "",
    `Headings required: ${required}.`,
    "Use commas between items. Use [square brackets] for multi-word phrases.",
    ...(input.mode === "mode1" ? modeOneGuidance : []),
    input.strict
      ? "STRICT: Output must start with 'Meta' on the first line and include all required headings."
      : "Aim for 8-14 items per heading.",
    "",
    "Prompt:",
    input.prompt.trim(),
  ];

  return header.join("\n");
};
