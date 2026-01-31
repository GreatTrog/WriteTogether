import { Router } from "express";
import { z } from "zod";
import { requireSupabaseAdmin } from "../services/supabaseAdmin";
import { decryptPassword, encryptPassword } from "../services/passwordCrypto";

const router = Router();

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

router.post("/login", async (req, res) => {
  const bodySchema = z.object({
    pupilId: z.string().uuid(),
    username: z.string().min(3).max(32),
    password: z.string().min(6).max(64),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const authUser = await requireAuthUser(token);
    const payload = bodySchema.parse(req.body);
    const supabase = requireSupabaseAdmin();

    const { data: teacherProfile, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single();
    if (teacherError || !teacherProfile) {
      return res.status(403).send("Teacher profile not found.");
    }

    const { data: pupilRow, error: pupilError } = await supabase
      .from("pupils")
      .select("id,owner_id,class_id")
      .eq("id", payload.pupilId)
      .single();
    if (pupilError || !pupilRow) {
      return res.status(404).send("Pupil not found.");
    }

    const ownerId =
      pupilRow.owner_id ?? (await resolveClassOwnerId(pupilRow.class_id)) ?? null;
    if (ownerId !== teacherProfile.id) {
      return res.status(403).send("Not allowed to create login for this pupil.");
    }

    const username = payload.username.toLowerCase().replace(/[^a-z0-9.]/g, "");
    if (!username) {
      return res.status(400).send("Invalid username.");
    }
    const email = `${username}@pupil.writetogether.local`;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        role: "pupil",
        pupil_id: payload.pupilId,
      },
    });

    if (createError || !created.user) {
      return res.status(400).send(createError?.message ?? "Unable to create user.");
    }

    const { error: updateError } = await supabase
      .from("pupils")
      .update({
        auth_user_id: created.user.id,
        username,
        auth_email: email,
        auth_password_enc: encryptPassword(payload.password),
        auth_password_set_at: new Date().toISOString(),
      })
      .eq("id", payload.pupilId);

    if (updateError) {
      return res.status(400).send(updateError.message);
    }

    return res.json({ authUserId: created.user.id, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return res.status(400).send(message);
  }
});

router.post("/link", async (req, res) => {
  const bodySchema = z.object({
    email: z.string().email(),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const authUser = await requireAuthUser(token);
    const payload = bodySchema.parse(req.body);
    const supabase = requireSupabaseAdmin();

    const { data: existing, error: existingError } = await supabase
      .from("pupils")
      .select("id,auth_user_id")
      .eq("auth_email", payload.email)
      .limit(1);

    if (existingError) {
      return res.status(400).send(existingError.message);
    }

    const record = existing?.[0];
    if (!record) {
      return res.status(404).send("No pupil matches this email.");
    }

    if (record.auth_user_id && record.auth_user_id !== authUser.id) {
      return res.status(409).send("Pupil already linked.");
    }

    if (!record.auth_user_id) {
      const { error: updateError } = await supabase
        .from("pupils")
        .update({ auth_user_id: authUser.id })
        .eq("id", record.id);
      if (updateError) {
        return res.status(400).send(updateError.message);
      }
    }

    const { error: metaError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: {
          role: "pupil",
          pupil_id: record.id,
        },
      },
    );
    if (metaError) {
      return res.status(400).send(metaError.message);
    }

    return res.json({ linked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return res.status(400).send(message);
  }
});

router.get("/:pupilId/password", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const authUser = await requireAuthUser(token);
    const pupilId = z.string().uuid().parse(req.params.pupilId);
    const supabase = requireSupabaseAdmin();

    const { data: teacherProfile, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single();
    if (teacherError || !teacherProfile) {
      return res.status(403).send("Teacher profile not found.");
    }

    const { data: pupilRow, error: pupilError } = await supabase
      .from("pupils")
      .select("id,owner_id,class_id,auth_password_enc")
      .eq("id", pupilId)
      .single();
    if (pupilError || !pupilRow) {
      return res.status(404).send("Pupil not found.");
    }

    const ownerId =
      pupilRow.owner_id ?? (await resolveClassOwnerId(pupilRow.class_id)) ?? null;
    if (ownerId !== teacherProfile.id) {
      return res.status(403).send("Not allowed to view this password.");
    }

    if (!pupilRow.auth_password_enc) {
      return res.status(404).send("No password set.");
    }

    const password = decryptPassword(pupilRow.auth_password_enc);
    return res.json({ password });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return res.status(400).send(message);
  }
});

router.post("/:pupilId/reset-password", async (req, res) => {
  const bodySchema = z.object({
    password: z.string().min(6).max(64),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const authUser = await requireAuthUser(token);
    const pupilId = z.string().uuid().parse(req.params.pupilId);
    const { password } = bodySchema.parse(req.body);
    const supabase = requireSupabaseAdmin();

    const { data: teacherProfile, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single();
    if (teacherError || !teacherProfile) {
      return res.status(403).send("Teacher profile not found.");
    }

    const { data: pupilRow, error: pupilError } = await supabase
      .from("pupils")
      .select("id,owner_id,class_id,auth_user_id,username")
      .eq("id", pupilId)
      .single();
    if (pupilError || !pupilRow) {
      return res.status(404).send("Pupil not found.");
    }

    const ownerId =
      pupilRow.owner_id ?? (await resolveClassOwnerId(pupilRow.class_id)) ?? null;
    if (ownerId !== teacherProfile.id) {
      return res.status(403).send("Not allowed to reset this password.");
    }

    if (!pupilRow.auth_user_id || !pupilRow.username) {
      return res.status(409).send("No username/password login exists for this pupil.");
    }

    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      pupilRow.auth_user_id,
      { password },
    );
    if (updateAuthError) {
      return res.status(400).send(updateAuthError.message);
    }

    const { error: updatePupilError } = await supabase
      .from("pupils")
      .update({
        auth_password_enc: encryptPassword(password),
        auth_password_set_at: new Date().toISOString(),
      })
      .eq("id", pupilId);
    if (updatePupilError) {
      return res.status(400).send(updatePupilError.message);
    }

    return res.json({ password });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return res.status(400).send(message);
  }
});

export default router;
