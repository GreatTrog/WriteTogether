import { z } from "zod";

// Shared schema primitives keep the front-end and API aligned as features evolve.
export const ColourSlotSchema = z.enum(["who", "doing", "what", "where", "when"]);

export const WordBankItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  slot: ColourSlotSchema.optional(),
  tags: z.array(z.string()).default([]),
});

// Word bank shape underpins both the pupil tooling and teacher catalog views.
export const WordBankSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  level: z.enum(["ks1", "lks2", "uks2"]),
  tags: z.array(z.string()).default([]),
  colourMap: z.record(z.string(), z.string()).optional(),
  items: z.array(WordBankItemSchema),
});

// Assignment settings mirror the UI constraints (max banks, optional template, etc.).
export const AssignmentSchema = z.object({
  id: z.string(),
  classId: z.string(),
  modeLock: z.enum(["mode1", "mode2"]).optional(),
  wordBankIds: z.array(z.string()).max(6),
  templateId: z.string().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  settings: z
    .object({
      wordLimit: z.number().int().positive().optional(),
      enableTTS: z.boolean().default(true),
      slotsEnabled: z
        .array(ColourSlotSchema)
        .default(["who", "doing", "what", "where"]),
    })
    .default({}),
});

export type ColourSlot = z.infer<typeof ColourSlotSchema>;
export type WordBankItem = z.infer<typeof WordBankItemSchema>;
export type WordBank = z.infer<typeof WordBankSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
