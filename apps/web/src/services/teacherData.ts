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
  auth_email: string | null;
  auth_user_id: string | null;
  year_group: "Y1" | "Y2" | "Y3" | "Y4" | "Y5" | "Y6" | null;
};

export type TeacherPupilRow = TeacherPupil & {
  class_name: string | null;
  class_phase: TeacherClass["phase"] | null;
};

export type TeacherAssignmentRow = {
  id: string;
  title: string;
  class_id: string;
  mode_lock: "mode1" | "mode2" | null;
  word_bank_ids: string[] | null;
  template_id: string | null;
  due_at: string | null;
  settings: {
    wordLimit?: number;
    enableTTS?: boolean;
    slotsEnabled?: Array<"who" | "doing" | "what" | "where" | "when">;
  } | null;
  status: "draft" | "published" | null;
  catalog_word_banks: Record<string, unknown> | null;
};

export type TeacherAssignment = {
  id: string;
  title: string;
  classId: string;
  modeLock: "mode1" | "mode2";
  wordBankIds: string[];
  templateId: string | null;
  dueAt: Date | null;
  settings: {
    wordLimit?: number;
    enableTTS?: boolean;
    slotsEnabled?: Array<"who" | "doing" | "what" | "where" | "when">;
  };
  status: "draft" | "published";
  catalogWordBanks?: Record<string, unknown>;
};

export type TeacherWordBankRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  level: "ks1" | "lks2" | "uks2";
  tags: string[] | null;
  colour_map: Record<string, string> | null;
  category: string | null;
  topic: string | null;
  word_bank_items: Array<{
    id: string;
    text: string;
    slot: "who" | "doing" | "what" | "where" | "when" | null;
    tags: string[] | null;
  }> | null;
};

export type TeacherWordBank = {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  level: "ks1" | "lks2" | "uks2";
  tags: string[];
  colourMap?: Record<string, string>;
  category: string;
  topic: string;
  items: Array<{
    id: string;
    text: string;
    tags: string[];
    slot?: "who" | "doing" | "what" | "where" | "when";
  }>;
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
    Pick<
      TeacherPupil,
      "display_name" | "needs" | "current_mode" | "year_group" | "auth_email"
    >
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
    .select(
      "id,class_id,display_name,needs,current_mode,archived_at,username,auth_email,auth_user_id,year_group,classes(name,phase)",
    )
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

export const fetchAssignments = async (): Promise<TeacherAssignment[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("assignments")
    .select(
      "id,title,class_id,mode_lock,word_bank_ids,template_id,due_at,settings,status,catalog_word_banks",
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    classId: row.class_id,
    modeLock: row.mode_lock ?? "mode2",
    wordBankIds: row.word_bank_ids ?? [],
    templateId: row.template_id ?? null,
    dueAt: row.due_at ? new Date(row.due_at) : null,
    settings: row.settings ?? {},
    status: row.status ?? "published",
    catalogWordBanks: row.catalog_word_banks ?? undefined,
  })) as TeacherAssignment[];
};

export const createAssignment = async (
  payload: Omit<TeacherAssignment, "id">,
): Promise<TeacherAssignment> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("assignments")
    .insert({
      title: payload.title,
      class_id: payload.classId,
      mode_lock: payload.modeLock,
      word_bank_ids: payload.wordBankIds,
      template_id: payload.templateId,
      due_at: payload.dueAt ? payload.dueAt.toISOString() : null,
      settings: payload.settings,
      status: payload.status,
      catalog_word_banks: payload.catalogWordBanks ?? null,
    })
    .select(
      "id,title,class_id,mode_lock,word_bank_ids,template_id,due_at,settings,status,catalog_word_banks",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create assignment.");
  }

  return {
    id: data.id,
    title: data.title,
    classId: data.class_id,
    modeLock: data.mode_lock ?? "mode2",
    wordBankIds: data.word_bank_ids ?? [],
    templateId: data.template_id ?? null,
    dueAt: data.due_at ? new Date(data.due_at) : null,
    settings: data.settings ?? {},
    status: data.status ?? "published",
    catalogWordBanks: data.catalog_word_banks ?? undefined,
  };
};

export const fetchTeacherWordBanks = async (): Promise<TeacherWordBank[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("word_banks")
    .select(
      "id,owner_id,title,description,level,tags,colour_map,category,topic,word_bank_items(id,text,slot,tags)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? undefined,
    level: row.level,
    tags: row.tags ?? [],
    colourMap: row.colour_map ?? undefined,
    category: row.category ?? "nouns",
    topic: row.topic ?? "General",
    items: (row.word_bank_items ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      tags: item.tags ?? [],
      slot: item.slot ?? undefined,
    })),
  })) as TeacherWordBank[];
};

export const createTeacherWordBank = async (
  payload: Omit<TeacherWordBank, "id" | "ownerId" | "items"> & {
    items: Array<{
      text: string;
      tags?: string[];
      slot?: "who" | "doing" | "what" | "where" | "when";
    }>;
  },
) => {
  const client = requireSupabase();
  const ownerId = await resolveTeacherProfileId();
  if (!ownerId) {
    throw new Error("Missing teacher profile.");
  }

  const { data: bank, error: bankError } = await client
    .from("word_banks")
    .insert({
      owner_id: ownerId,
      title: payload.title,
      description: payload.description ?? null,
      level: payload.level,
      tags: payload.tags ?? [],
      colour_map: payload.colourMap ?? null,
      category: payload.category,
      topic: payload.topic,
    })
    .select("id,owner_id,title,description,level,tags,colour_map,category,topic")
    .single();

  if (bankError || !bank) {
    throw new Error(bankError?.message ?? "Unable to create word bank.");
  }

  const itemsPayload = payload.items.map((item) => ({
    bank_id: bank.id,
    text: item.text,
    tags: item.tags ?? [],
    slot: item.slot ?? null,
  }));

  const { data: items, error: itemsError } = await client
    .from("word_bank_items")
    .insert(itemsPayload)
    .select("id,text,slot,tags");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    id: bank.id,
    ownerId: bank.owner_id,
    title: bank.title,
    description: bank.description ?? undefined,
    level: bank.level,
    tags: bank.tags ?? [],
    colourMap: bank.colour_map ?? undefined,
    category: bank.category ?? "nouns",
    topic: bank.topic ?? "General",
    items: (items ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      tags: item.tags ?? [],
      slot: item.slot ?? undefined,
    })),
  } satisfies TeacherWordBank;
};
