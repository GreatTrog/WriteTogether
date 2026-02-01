import { Router } from "express";
import { z } from "zod";

import { hasGeminiKey, requireGeminiKey } from "../services/gemini.js";
import { generateGeminiText, listGeminiModels } from "../services/geminiClient.js";
import {
  parseWordBankText,
  validateWordBankMode,
} from "../services/wordBankParser.js";
import { buildWordBankPrompt } from "../services/wordBankPrompts.js";

const router = Router();

const WordBankRequestSchema = z.object({
  mode: z.enum(["mode1", "mode2"]),
  prompt: z.string().min(10),
  title: z.string().min(2).optional(),
  subjectLink: z.string().min(2).optional(),
  yearGroup: z.string().min(1).optional(),
  textType: z.string().min(1).optional(),
  subType: z.string().min(1).optional(),
  readingAge: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  author: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
});

router.get("/status", (_req, res) => {
  res.json({
    provider: "gemini",
    hasKey: hasGeminiKey(),
  });
});

router.get("/models", (_req, res) => {
  try {
    requireGeminiKey();
  } catch (error) {
    return res.status(503).json({
      error: error instanceof Error ? error.message : "Gemini API key missing.",
    });
  }

  return listGeminiModels()
    .then((models) => {
      const generatable = models
        .filter((model) =>
          model.supportedGenerationMethods.includes("generateContent"),
        )
        .map((model) => model.name);
      return res.json({
        models,
        generateContentModels: generatable,
      });
    })
    .catch((error) => {
      return res.status(502).json({
        error: error instanceof Error ? error.message : "Unable to list models.",
      });
    });
});

router.post("/word-banks/generate", (req, res) => {
  const parsed = WordBankRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request payload.",
      details: parsed.error.flatten(),
    });
  }

  try {
    requireGeminiKey();
  } catch (error) {
    return res.status(503).json({
      error: error instanceof Error ? error.message : "Gemini API key missing.",
    });
  }

  const payload = parsed.data;
  const prompt = buildWordBankPrompt(payload);

  if (payload.dryRun) {
    return res.json({
      dryRun: true,
      prompt,
    });
  }

  const model = process.env.GEMINI_MODEL ?? "models/gemini-flash-latest";

  return generateGeminiText({ model, prompt })
    .then((text) => {
      const parsedBank = parseWordBankText(text);
      validateWordBankMode(parsedBank, payload.mode);
      return parsedBank;
    })
    .catch((error) => {
      // Retry once with stricter prompt guidance.
      const retryPrompt = buildWordBankPrompt({ ...payload, strict: true });
      return generateGeminiText({ model, prompt: retryPrompt }).then((text) => {
        const parsedBank = parseWordBankText(text);
        validateWordBankMode(parsedBank, payload.mode);
        return parsedBank;
      });
    })
    .then((parsedBank) =>
      res.json({
        provider: "gemini",
        model,
        raw: parsedBank.raw,
        meta: parsedBank.meta,
        sections: parsedBank.sections,
      }),
    )
    .catch((error) => {
      return res.status(422).json({
        error: error instanceof Error ? error.message : "Invalid word bank output.",
      });
    });
});

export default router;
