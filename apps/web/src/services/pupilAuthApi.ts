import { supabase } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const loginServiceHint =
  "Login service is unreachable. Ensure the API server is running and VITE_API_BASE_URL points to it.";

const toNetworkError = (error: unknown) => {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`${loginServiceHint} Request timed out.`);
  }
  if (error instanceof Error) {
    return new Error(`${loginServiceHint} (${error.message})`);
  }
  return new Error(loginServiceHint);
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 8000,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    throw toNetworkError(error);
  } finally {
    clearTimeout(timeout);
  }
};

export type CreatePupilLoginPayload = {
  pupilId: string;
  username: string;
  password: string;
};

export type CreatePupilLoginResult = {
  authUserId: string | null;
  email: string;
};

export const createPupilLogin = async (
  payload: CreatePupilLoginPayload,
): Promise<CreatePupilLoginResult> => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Missing auth session.");
  }

  const response = await fetchWithTimeout(`${apiBaseUrl}/api/pupils/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to create login.");
  }

  return response.json();
};

export const linkPupilByEmail = async (email: string) => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Missing auth session.");
  }

  const response = await fetchWithTimeout(`${apiBaseUrl}/api/pupils/link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to link pupil.");
  }
};

export const revealPupilPassword = async (pupilId: string) => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Missing auth session.");
  }

  const response = await fetchWithTimeout(`${apiBaseUrl}/api/pupils/${pupilId}/password`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to reveal password.");
  }

  const data = await response.json();
  return data.password as string;
};

export const resetPupilPassword = async (pupilId: string, password: string) => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Missing auth session.");
  }

  const response = await fetchWithTimeout(`${apiBaseUrl}/api/pupils/${pupilId}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to reset password.");
  }

  const data = await response.json();
  return data.password as string;
};

export const ensurePupilAuthApiAvailable = async () => {
  const response = await fetchWithTimeout(`${apiBaseUrl}/health`, undefined, 5000);
  if (!response.ok) {
    throw new Error(`${loginServiceHint} Health check failed.`);
  }
};
