const resolvedKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

export const hasGeminiKey = () => Boolean(resolvedKey.trim());

export const requireGeminiKey = () => {
  if (!hasGeminiKey()) {
    throw new Error(
      "Gemini API key missing. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in apps/server/.env.local.",
    );
  }
  return resolvedKey.trim();
};
