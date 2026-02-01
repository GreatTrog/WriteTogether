import { requireGeminiKey } from "./gemini.js";

type GeminiGenerateInput = {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

type GeminiTextResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GeminiModelsResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com";

const normalizeModel = (model: string) =>
  model.startsWith("models/") ? model.slice("models/".length) : model;

const extractText = (payload: GeminiTextResponse) => {
  const parts =
    payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "") ?? [];
  return parts.join("").trim();
};

export const generateGeminiText = async ({
  model,
  prompt,
  temperature = 0.4,
  maxOutputTokens = 1600,
}: GeminiGenerateInput) => {
  const key = requireGeminiKey();
  const response = await fetch(
    `${GEMINI_ENDPOINT}/v1beta/models/${normalizeModel(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini request failed (${response.status}): ${errorBody}`,
    );
  }

  const payload = (await response.json()) as GeminiTextResponse;
  const text = extractText(payload);
  if (!text) {
    throw new Error("Gemini response contained no text.");
  }
  return text;
};

export const listGeminiModels = async () => {
  const key = requireGeminiKey();
  const response = await fetch(`${GEMINI_ENDPOINT}/v1beta/models`, {
    headers: {
      "x-goog-api-key": key,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini listModels failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as GeminiModelsResponse;
  return (payload.models ?? []).map((model) => ({
    name: model.name ?? "",
    supportedGenerationMethods: model.supportedGenerationMethods ?? [],
  }));
};
