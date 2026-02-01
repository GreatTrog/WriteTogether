const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export type AiWordBankSection = {
  heading: string;
  items: string[];
};

export type AiWordBankResponse = {
  raw: string;
  meta: Record<string, unknown>;
  sections: AiWordBankSection[];
};

export type AiWordBankRequest = {
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
};

export const generateAiWordBank = async (
  payload: AiWordBankRequest,
): Promise<AiWordBankResponse> => {
  const response = await fetch(`${apiBaseUrl}/api/ai/word-banks/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error || "Unable to generate word bank with AI.";
    throw new Error(message);
  }

  return (await response.json()) as AiWordBankResponse;
};
