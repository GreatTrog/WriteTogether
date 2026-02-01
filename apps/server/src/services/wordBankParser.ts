type WordBankMeta = {
  year: string;
  text_type: string;
  sub_type: string;
  topic?: string;
  subject_links?: string[];
  keywords?: string[];
  reading_age?: string;
  author?: string;
  version?: string;
};

type WordBankSection = {
  heading: string;
  items: string[];
};

export type ParsedWordBank = {
  raw: string;
  meta: WordBankMeta;
  sections: WordBankSection[];
};

const normalizeHeading = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "").replace(/-/g, "");

const splitItems = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const stripCodeFences = (input: string) =>
  input.replace(/```[\s\S]*?```/g, (match) =>
    match.replace(/```/g, "").trim(),
  );

export const parseWordBankText = (input: string): ParsedWordBank => {
  const cleaned = stripCodeFences(input).trim();
  if (!cleaned) {
    throw new Error("Empty word bank response.");
  }

  const blocks = cleaned
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    throw new Error("Word bank response is missing content blocks.");
  }

  const metaBlock = blocks[0].split("\n").map((line) => line.trim());
  if (!metaBlock[0] || metaBlock[0].toLowerCase() !== "meta") {
    throw new Error("Word bank response must start with a Meta block.");
  }

  const metaLines = metaBlock.slice(1);
  const meta: Partial<WordBankMeta> = {};
  metaLines.forEach((line) => {
    if (!line) {
      return;
    }
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) {
      return;
    }
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) {
      return;
    }
    if (key === "subject_links" || key === "keywords") {
      const items = splitItems(value);
      if (items.length > 0) {
        meta[key] = items;
      }
      return;
    }
    meta[key as keyof WordBankMeta] = value;
  });

  if (!meta.year || !meta.text_type || !meta.sub_type) {
    throw new Error("Meta block must include year, text_type, and sub_type.");
  }

  const sections: WordBankSection[] = blocks.slice(1).map((block) => {
    const lines = block.split("\n").map((line) => line.trim());
    const [rawHeading, ...restLines] = lines;
    const colonIndex = rawHeading.indexOf(":");
    const heading =
      colonIndex >= 0 ? rawHeading.slice(0, colonIndex).trim() : rawHeading;
    const inlineItems = colonIndex >= 0 ? rawHeading.slice(colonIndex + 1) : "";
    const itemsLine = [inlineItems, ...restLines].join(" ").trim();
    const items = splitItems(itemsLine);
    return {
      heading,
      items,
    };
  });

  if (sections.length === 0) {
    throw new Error("Word bank response needs at least one heading section.");
  }

  return {
    raw: cleaned,
    meta: meta as WordBankMeta,
    sections,
  };
};

export const validateWordBankMode = (
  parsed: ParsedWordBank,
  mode: "mode1" | "mode2",
) => {
  const headings = new Set(
    parsed.sections.map((section) => normalizeHeading(section.heading)),
  );

  if (mode === "mode1") {
    const required = ["who", "doing", "what", "where", "when"];
    const missing = required.filter((heading) => !headings.has(heading));
    if (missing.length > 0) {
      throw new Error(
        `Mode 1 word banks must include headings: ${missing.join(", ")}.`,
      );
    }
  }

  if (mode === "mode2") {
    const required = ["nouns", "verbs", "adjectives", "adverbials"];
    const missing = required.filter((heading) => !headings.has(heading));
    const hasConnectives =
      headings.has("connectives") || headings.has("conjunctions");
    const hasStarters =
      headings.has("sentencestarters") || headings.has("starters");
    if (missing.length > 0 || !hasStarters) {
      const extras = [];
      if (!hasConnectives) {
        extras.push("connectives");
      }
      if (!hasStarters) {
        extras.push("sentencestarters");
      }
      const missingParts = [...missing, ...extras];
      const base =
        missingParts.length > 0 ? missingParts.join(", ") : "SentenceStarters";
      throw new Error(`Mode 2 word banks must include headings: ${base}.`);
    }
  }

  parsed.sections.forEach((section) => {
    if (section.items.length === 0) {
      throw new Error(
        `Heading "${section.heading}" must include at least one item.`,
      );
    }
  });
};
