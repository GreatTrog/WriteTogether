import { Router } from "express";
import { z } from "zod";
import { requireSupabaseAdmin } from "../services/supabaseAdmin.js";

const exportsRouter = Router();

// Simulate the export queue so the UI can demo status messaging.

exportsRouter.post("/preview", (req, res) => {
  const content: string = req.body?.content ?? "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  res.json({
    status: "queued",
    wordCount,
    downloadUrl: null,
    message:
      "Export job queued. In production this would return a signed download link.",
  });
});

const requireAuthUser = async (token?: string) => {
  const client = requireSupabaseAdmin();
  if (!token) {
    throw new Error("Missing auth token.");
  }
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Invalid auth token.");
  }
  return data.user;
};

const resolveClassOwnerId = async (classId: string | null) => {
  if (!classId) {
    return null;
  }
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("classes")
    .select("owner_id")
    .eq("id", classId)
    .single();
  if (error) {
    return null;
  }
  return data?.owner_id ?? null;
};

const sanitizeFilename = (value: string) =>
  value.replace(/[^\w.\-]+/g, "_").replace(/_{2,}/g, "_");

exportsRouter.post("/submit", async (req, res) => {
  const bodySchema = z.object({
    filename: z.string().min(1),
    pdf_base64: z.string().min(20),
    word_count: z.number().int().nonnegative(),
    saved_at: z.string().optional(),
    size_bytes: z.number().int().nonnegative().optional(),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const authUser = await requireAuthUser(token);
    const payload = bodySchema.parse(req.body);
    const supabase = requireSupabaseAdmin();

    const role = authUser.user_metadata?.role;
    const pupilId = authUser.user_metadata?.pupil_id;
    if (role !== "pupil" || !pupilId) {
      return res.status(403).send("Only pupils can submit exports.");
    }

    const { data: pupilRow, error: pupilError } = await supabase
      .from("pupils")
      .select("id,username,owner_id,class_id")
      .eq("id", pupilId)
      .single();
    if (pupilError || !pupilRow) {
      return res.status(404).send("Pupil not found.");
    }

    const ownerId =
      pupilRow.owner_id ?? (await resolveClassOwnerId(pupilRow.class_id)) ?? null;
    if (!ownerId) {
      return res.status(400).send("Pupil class owner not found.");
    }

    const safeName = sanitizeFilename(payload.filename);
    const storagePath = `${ownerId}/${pupilRow.id}/${safeName}`;
    const buffer = Buffer.from(payload.pdf_base64, "base64");
    const sizeBytes = payload.size_bytes ?? buffer.length;
    const savedAt = payload.saved_at ?? new Date().toISOString();
    const username = pupilRow.username ?? "Pupil";

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(storagePath, buffer, {
        upsert: true,
        contentType: "application/pdf",
      });
    if (uploadError) {
      return res.status(400).send(uploadError.message);
    }

    const { error: insertError } = await supabase.from("shared_files").insert({
      owner_id: ownerId,
      filename: safeName,
      username,
      saved_at: savedAt,
      location: "Submitted by pupil",
      size_bytes: sizeBytes,
      word_count: payload.word_count,
      storage_key: storagePath,
    });
    if (insertError) {
      return res.status(400).send(insertError.message);
    }

    return res.json({
      ownerId,
      filename: safeName,
      username,
      savedAt,
      location: "Submitted by pupil",
      sizeBytes,
      wordCount: payload.word_count,
      storageKey: storagePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return res.status(400).send(message);
  }
});

export default exportsRouter;
