import { supabase } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

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

  const response = await fetch(`${apiBaseUrl}/api/pupils/login`, {
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

  const response = await fetch(`${apiBaseUrl}/api/pupils/link`, {
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

  const response = await fetch(`${apiBaseUrl}/api/pupils/${pupilId}/password`, {
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

  const response = await fetch(`${apiBaseUrl}/api/pupils/${pupilId}/reset-password`, {
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
