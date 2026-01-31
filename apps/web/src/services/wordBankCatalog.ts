import { z } from "zod";

// Lookup metadata and loader for the on-disk word bank collection bundled with Vite.
export const TEXT_TYPE_LABELS = [
  { value: "narrative", label: "Narrative" },
  { value: "non-narrative", label: "Non-Narrative" },
  { value: "poetry", label: "Poetry" },
] as const;

export type TextType = (typeof TEXT_TYPE_LABELS)[number]["value"];

export const TEXT_TYPE_SUBTYPES: Record<TextType, string[]> = {
  narrative: [
    "narrative-stories",
    "traditional-tales",
    "fables",
    "playscripts",
    "dialogue-scenes",
    "stories-from-other-cultures",
    "modern-picture-books",
    "chapter-books-novels",
    "narrative-poems",
  ],
  "non-narrative": [
    "instructions",
    "recounts",
    "reports",
    "explanations",
    "persuasive-texts",
    "arguments-discussion",
    "biographies-autobiographies",
    "information-texts",
    "labels-captions",
    "timetables-schedules",
    "maps-diagrams-annotations",
    "emails-digital-messages",
    "book-reviews-reading-journals",
    "postcards-invitations",
    "posters-leaflets",
    "school-newsletters-bulletins",
  ],
  poetry: [
    "rhyming-poems",
    "acrostic-poems",
    "shape-concrete-poems",
    "kennings",
    "haiku",
    "free-verse",
    "narrative-poems",
    "performance-poetry",
  ],
};

const metaSchema = z.object({
  year: z.string(),
  text_type: z.string(),
  sub_type: z.string(),
  topic: z.string().optional(),
  subject_links: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  reading_age: z.string().optional(),
  author: z.string().optional(),
  version: z.coerce.number().optional(),
});

const headingSchema = z.object({
  label: z.string(),
  items: z.array(
    z.object({
      text: z.string(),
      isPhrase: z.boolean().default(false),
    }),
  ),
});

export type WordBankHeading = z.infer<typeof headingSchema>;

export type WordBankDocument = {
  id: string;
  filePath: string;
  fileName: string;
  meta: z.infer<typeof metaSchema> & {
    text_type: TextType;
  };
  headings: WordBankHeading[];
  searchText: string;
};

export type WordBankSnapshot = Pick<
  WordBankDocument,
  "id" | "fileName" | "meta" | "headings"
>;

// Lazily load word bank text files to keep the initial bundle lighter.
const rawModules = import.meta.glob<string>("../wordbanks/**/*.txt", {
  import: "default",
  query: "?raw",
});

const parseWordBank = (raw: string, filePath: string): WordBankDocument => {
  // Parse the markdown-like bank format into structured metadata and headings.
  const paragraphs = raw
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    throw new Error(`Word bank at ${filePath} is empty.`);
  }

  const [metaBlock, ...headingBlocks] = paragraphs;
  const metaLines = metaBlock.split(/\r?\n/).map((line) => line.trim());
  const firstLine = metaLines.shift();

  if (!firstLine || firstLine.toLowerCase() !== "meta") {
    throw new Error(`Meta block missing for word bank at ${filePath}.`);
  }

  const metaEntries: Record<string, string | string[]> = {};

  metaLines.forEach((line) => {
    if (!line.includes(":")) {
      return;
    }
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (["subject_links", "keywords"].includes(key)) {
      metaEntries[key] = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else if (key === "version") {
      metaEntries[key] = value;
    } else {
      metaEntries[key] = value;
    }
  });

  const parsedMeta = metaSchema.parse(metaEntries);
  const normalisedTextType = parsedMeta.text_type.toLowerCase() as TextType;

  if (!TEXT_TYPE_SUBTYPES[normalisedTextType]) {
    throw new Error(
      `Unsupported text_type "${parsedMeta.text_type}" in ${filePath}`,
    );
  }

  const normalisedMeta = {
    ...parsedMeta,
    text_type: normalisedTextType,
  };

  const parseHeading = (block: string): WordBankHeading | null => {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    const label = lines.shift();

    if (!label) {
      return null;
    }

    const content = lines.join(" ").trim();
    const tokens: string[] = [];
    let buffer = "";
    let depth = 0;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];

      if (char === "[") {
        depth += 1;
        buffer += char;
        continue;
      }

      if (char === "]") {
        depth = Math.max(0, depth - 1);
        buffer += char;
        continue;
      }

      if (char === "," && depth === 0) {
        const token = buffer.trim();
        if (token.length > 0) {
          tokens.push(token);
        }
        buffer = "";
        continue;
      }

      buffer += char;
    }

    const finalToken = buffer.trim();
    if (finalToken.length > 0) {
      tokens.push(finalToken);
    }

    const entries = tokens.map((entry) => {
      const phraseMatch = entry.match(/^\[(.*)\]$/);
      if (phraseMatch) {
        return {
          text: phraseMatch[1],
          isPhrase: true,
        };
      }
      return {
        text: entry,
        isPhrase: false,
      };
    });

    return headingSchema.parse({
      label,
      items: entries,
    });
  };

  const headings = headingBlocks
    .map((block) => parseHeading(block))
    .filter((heading): heading is WordBankHeading => Boolean(heading));

  const fileName = filePath.split("/").pop() ?? filePath;
  const id = fileName.replace(/\.txt$/, "");

  const searchChunks = [
    normalisedMeta.year,
    normalisedMeta.text_type,
    normalisedMeta.sub_type,
    normalisedMeta.topic ?? "",
    normalisedMeta.reading_age ?? "",
    normalisedMeta.author ?? "",
    ...(normalisedMeta.subject_links ?? []),
    ...(normalisedMeta.keywords ?? []),
    ...headings.flatMap((heading) => [
      heading.label,
      ...heading.items.map((item) => item.text),
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return {
    id,
    filePath,
    fileName,
    meta: normalisedMeta,
    headings,
    searchText: searchChunks,
  };
};

const sortCatalog = (a: WordBankDocument, b: WordBankDocument) => {
  const year = a.meta.year.localeCompare(b.meta.year);
  if (year !== 0) {
    return year;
  }

  const textType = a.meta.text_type.localeCompare(b.meta.text_type);
  if (textType !== 0) {
    return textType;
  }

  const subType = a.meta.sub_type.localeCompare(b.meta.sub_type);
  if (subType !== 0) {
    return subType;
  }

  const topicA = a.meta.topic ?? "";
  const topicB = b.meta.topic ?? "";
  return topicA.localeCompare(topicB);
};

let catalogPromise: Promise<WordBankDocument[]> | null = null;

export const loadWordBankCatalog = async () => {
  if (!catalogPromise) {
    catalogPromise = Promise.all(
      Object.entries(rawModules).map(async ([filePath, loader]) => {
        const rawContent = await loader();
        return parseWordBank(rawContent, filePath);
      }),
    ).then((entries) => entries.sort(sortCatalog));
  }
  return catalogPromise;
};

export const textTypeLabel = (value: TextType) =>
  TEXT_TYPE_LABELS.find((entry) => entry.value === value)?.label ?? value;
