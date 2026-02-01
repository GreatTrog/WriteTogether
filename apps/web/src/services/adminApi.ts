import { supabase } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export type AdminTeacher = {
  authUserId: string;
  email: string | null;
  role: string | null;
  teacherProfileId: string | null;
  archivedAt: string | null;
  classCount: number;
  activeClassCount: number;
};

export type AdminInvite = {
  id: string;
  email: string;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  auth_user_id: string | null;
  invited_by: string | null;
};

const requireToken = async () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Missing auth session.");
  }
  return token;
};

export const bootstrapTeacherAccess = async () => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/bootstrap`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to bootstrap access.");
  }

  return response.json() as Promise<{
    role: string | null;
    teacherProfileId: string | null;
    invited: boolean;
  }>;
};

export const fetchAdminTeachers = async (): Promise<AdminTeacher[]> => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/teachers`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load teachers.");
  }

  const data = await response.json();
  return data.teachers as AdminTeacher[];
};

export const fetchAdminInvites = async (): Promise<AdminInvite[]> => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/invites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load invites.");
  }

  const data = await response.json();
  return data.invites as AdminInvite[];
};

export const sendTeacherInvite = async (email: string) => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to send invite.");
  }

  return response.json() as Promise<{ invite: AdminInvite; emailSent: boolean }>;
};

export const revokeTeacherInvite = async (inviteId: string) => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/invites/${inviteId}/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to revoke invite.");
  }

  return response.json() as Promise<{ invite: AdminInvite }>;
};

export const reassignTeacherClasses = async (authUserId: string, newOwnerId: string) => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/teachers/${authUserId}/reassign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newOwnerId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to reassign classes.");
  }

  return response.json() as Promise<{ reassigned: boolean }>;
};

export const archiveTeacher = async (authUserId: string, reassignTo?: string | null) => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/teachers/${authUserId}/archive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reassignTo: reassignTo ?? null }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to archive teacher.");
  }

  return response.json() as Promise<{ archived: boolean }>;
};

export const deleteTeacher = async (authUserId: string, reassignTo?: string | null) => {
  const token = await requireToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/teachers/${authUserId}/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reassignTo: reassignTo ?? null }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to delete teacher.");
  }

  return response.json() as Promise<{ deleted: boolean }>;
};
