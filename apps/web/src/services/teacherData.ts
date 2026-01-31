import { supabase } from "./supabaseClient";
import { generateJoinCode } from "../utils/generateJoinCode";

export type TeacherClass = {
  id: string;
  name: string;
  phase: "KS1" | "LKS2" | "UKS2";
  join_code: string;
  archived_at: string | null;
  pupils: TeacherPupil[];
};

export type TeacherPupil = {
  id: string;
  class_id: string | null;
  display_name: string;
  needs: string[];
  current_mode: "mode1" | "mode2";
  archived_at: string | null;
  username: string | null;
  year_group: "Y1" | "Y2" | "Y3" | "Y4" | "Y5" | "Y6" | null;
};

export type TeacherPupilRow = TeacherPupil & {
  class_name: string | null;
  class_phase: TeacherClass["phase"] | null;
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
};

export const resolveTeacherProfileId = async () => {
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return null;
  }
  const { data, error } = await client
    .from("teacher_profiles")
    .select("id")
    .eq("auth_user_id", userId)
    .single();
  if (error) {
    console.warn("Unable to resolve teacher profile:", error.message);
    return null;
  }
  return data?.id ?? null;
};

export const fetchClassesWithPupils = async (): Promise<TeacherClass[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("classes")
    .select(
      "id,name,phase,join_code,archived_at,pupils(id,class_id,display_name,needs,current_mode,archived_at,username,year_group)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    pupils: (row.pupils ?? []).filter(
      (pupil) => pupil.archived_at === null,
    ),
  })) as TeacherClass[];
};

export const createClass = async (name: string, phase: TeacherClass["phase"]) => {
  const client = requireSupabase();
  const ownerId = await resolveTeacherProfileId();
  if (!ownerId) {
    throw new Error("Missing teacher profile.");
  }

  const { data, error } = await client
    .from("classes")
    .insert({
      owner_id: ownerId,
      name,
      phase,
      join_code: generateJoinCode(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data?.id ?? null;
};

export const updateClass = async (
  classId: string,
  updates: Partial<Pick<TeacherClass, "name" | "phase">>,
) => {
  const client = requireSupabase();
  const { error } = await client.from("classes").update(updates).eq("id", classId);
  if (error) {
    throw new Error(error.message);
  }
};

export const archiveClass = async (classId: string) => {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from("classes")
    .update({ archived_at: now })
    .eq("id", classId);
  if (error) {
    throw new Error(error.message);
  }
};

export const deleteClass = async (classId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("classes").delete().eq("id", classId);
  if (error) {
    throw new Error(error.message);
  }
};

export const createPupil = async (
  classId: string | null,
  displayName: string,
  needs: string[],
  yearGroup: TeacherPupil["year_group"],
) => {
  const client = requireSupabase();
  const ownerId = await resolveTeacherProfileId();
  if (!ownerId) {
    throw new Error("Missing teacher profile.");
  }
  const { error } = await client.from("pupils").insert({
    class_id: classId,
    owner_id: ownerId,
    display_name: displayName,
    needs,
    current_mode: "mode1",
    year_group: yearGroup,
  });
  if (error) {
    throw new Error(error.message);
  }
};

export const updatePupil = async (
  pupilId: string,
  updates: Partial<
    Pick<TeacherPupil, "display_name" | "needs" | "current_mode" | "year_group">
  >,
) => {
  const client = requireSupabase();
  const { error } = await client.from("pupils").update(updates).eq("id", pupilId);
  if (error) {
    throw new Error(error.message);
  }
};

export const updatePupilClass = async (pupilId: string, classId: string | null) => {
  const client = requireSupabase();
  const { error } = await client
    .from("pupils")
    .update({ class_id: classId })
    .eq("id", pupilId);
  if (error) {
    throw new Error(error.message);
  }
};

export const fetchPupils = async (): Promise<TeacherPupilRow[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("pupils")
    .select("id,class_id,display_name,needs,current_mode,archived_at,username,year_group,classes(name,phase)")
    .is("archived_at", null)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    class_name: row.classes?.name ?? null,
    class_phase: row.classes?.phase ?? null,
  })) as TeacherPupilRow[];
};

export const archivePupil = async (pupilId: string) => {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from("pupils")
    .update({ archived_at: now })
    .eq("id", pupilId);
  if (error) {
    throw new Error(error.message);
  }
};

export const deletePupil = async (pupilId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("pupils").delete().eq("id", pupilId);
  if (error) {
    throw new Error(error.message);
  }
};
