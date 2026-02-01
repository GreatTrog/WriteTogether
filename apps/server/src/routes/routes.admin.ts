import { Router } from "express";
import { z } from "zod";
import { requireSupabaseAdmin } from "../services/supabaseAdmin.js";

const router = Router();

const adminEmails = (process.env.SUPABASE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email?: string | null) =>
  Boolean(email && adminEmails.includes(email.toLowerCase()));

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

const requireAdminUser = async (token?: string) => {
  const user = await requireAuthUser(token);
  const role = user.user_metadata?.role;
  if (role !== "admin" && !isAdminEmail(user.email)) {
    throw new Error("Admin access required.");
  }
  return user;
};

const ensureTeacherProfile = async (authUserId: string) => {
  const client = requireSupabaseAdmin();
  const { data: existing, error } = await client
    .from("teacher_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  if (!error && existing?.id) {
    return existing.id as string;
  }

  const { data: created, error: createError } = await client
    .from("teacher_profiles")
    .insert({ auth_user_id: authUserId })
    .select("id")
    .single();
  if (createError) {
    throw new Error(createError.message);
  }
  return created?.id ?? null;
};

router.post("/bootstrap", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = await requireAuthUser(token);
    const email = user.email?.toLowerCase() ?? null;
    const client = requireSupabaseAdmin();
    const isAdmin = isAdminEmail(email);

    if (isAdmin) {
      await client.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, role: "admin" },
      });
      const profileId = await ensureTeacherProfile(user.id);
      return res.json({ role: "admin", teacherProfileId: profileId, invited: true });
    }

    const role = user.user_metadata?.role;
    if (role === "teacher" || role === "admin") {
      const profileId = await ensureTeacherProfile(user.id);
      return res.json({ role, teacherProfileId: profileId, invited: true });
    }

    if (!email) {
      return res.json({ role: null, teacherProfileId: null, invited: false });
    }

    const { data: invite, error: inviteError } = await client
      .from("teacher_invites")
      .select("id,status")
      .eq("email", email)
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (inviteError || !invite) {
      return res.json({ role: null, teacherProfileId: null, invited: false });
    }

    await client.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: "teacher" },
    });

    const profileId = await ensureTeacherProfile(user.id);
    await client
      .from("teacher_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        auth_user_id: user.id,
      })
      .eq("id", invite.id);

    return res.json({ role: "teacher", teacherProfileId: profileId, invited: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bootstrap.";
    return res.status(400).send(message);
  }
});

router.get("/teachers", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await requireAdminUser(token);
    const client = requireSupabaseAdmin();

    const { data: userData, error: userError } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (userError) {
      return res.status(400).send(userError.message);
    }

    const teachers = (userData.users ?? []).filter((user) => {
      const role = user.user_metadata?.role;
      return role === "teacher" || role === "admin" || isAdminEmail(user.email);
    });

    const authUserIds = teachers.map((user) => user.id);
    const { data: profiles } = await client
      .from("teacher_profiles")
      .select("id,auth_user_id,archived_at")
      .in("auth_user_id", authUserIds);

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.auth_user_id, profile]),
    );

    const profileIds = (profiles ?? []).map((profile) => profile.id);
    const { data: classes } = profileIds.length
      ? await client
          .from("classes")
          .select("id,owner_id,archived_at")
          .in("owner_id", profileIds)
      : { data: [] as Array<{ id: string; owner_id: string; archived_at: string | null }> };

    const classCountMap = new Map<string, { total: number; active: number }>();
    (classes ?? []).forEach((record) => {
      const entry = classCountMap.get(record.owner_id) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (!record.archived_at) {
        entry.active += 1;
      }
      classCountMap.set(record.owner_id, entry);
    });

    const payload = teachers.map((user) => {
      const profile = profileMap.get(user.id);
      const counts = profile?.id ? classCountMap.get(profile.id) : undefined;
      return {
        authUserId: user.id,
        email: user.email ?? null,
        role: user.user_metadata?.role ?? (isAdminEmail(user.email) ? "admin" : null),
        teacherProfileId: profile?.id ?? null,
        archivedAt: profile?.archived_at ?? null,
        classCount: counts?.total ?? 0,
        activeClassCount: counts?.active ?? 0,
      };
    });

    return res.json({ teachers: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load teachers.";
    return res.status(403).send(message);
  }
});

router.get("/invites", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await requireAdminUser(token);
    const client = requireSupabaseAdmin();

    const { data, error } = await client
      .from("teacher_invites")
      .select("id,email,status,invited_at,accepted_at,revoked_at,auth_user_id,invited_by")
      .order("invited_at", { ascending: false });

    if (error) {
      return res.status(400).send(error.message);
    }

    return res.json({ invites: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load invites.";
    return res.status(403).send(message);
  }
});

router.post("/invites", async (req, res) => {
  const bodySchema = z.object({
    email: z.string().email(),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const adminUser = await requireAdminUser(token);
    const payload = bodySchema.parse(req.body);
    const client = requireSupabaseAdmin();
    const email = payload.email.trim().toLowerCase();

    const { error: inviteError } = await client.auth.admin.inviteUserByEmail(email, {
      data: { role: "teacher" },
    });

    const { data: existing, error: lookupError } = await client
      .from("teacher_invites")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) {
      return res.status(400).send(lookupError.message);
    }

    const invitePayload = {
      email,
      invited_by: adminUser.id,
      status: "pending",
      invited_at: new Date().toISOString(),
      accepted_at: null,
      revoked_at: null,
    };

    const { data, error } = existing?.id
      ? await client
          .from("teacher_invites")
          .update(invitePayload)
          .eq("id", existing.id)
          .select(
            "id,email,status,invited_at,accepted_at,revoked_at,auth_user_id,invited_by",
          )
          .single()
      : await client
          .from("teacher_invites")
          .insert(invitePayload)
          .select(
            "id,email,status,invited_at,accepted_at,revoked_at,auth_user_id,invited_by",
          )
          .single();

    if (error) {
      return res.status(400).send(error.message);
    }

    return res.json({ invite: data, emailSent: !inviteError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite.";
    return res.status(400).send(message);
  }
});

router.post("/invites/:inviteId/revoke", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await requireAdminUser(token);
    const inviteId = z.string().uuid().parse(req.params.inviteId);
    const client = requireSupabaseAdmin();

    const { data, error } = await client
      .from("teacher_invites")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", inviteId)
      .select("id,email,status,invited_at,accepted_at,revoked_at,auth_user_id,invited_by")
      .single();

    if (error) {
      return res.status(400).send(error.message);
    }

    return res.json({ invite: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke invite.";
    return res.status(400).send(message);
  }
});

router.post("/teachers/:authUserId/reassign", async (req, res) => {
  const bodySchema = z.object({
    newOwnerId: z.string().uuid(),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await requireAdminUser(token);
    const authUserId = z.string().uuid().parse(req.params.authUserId);
    const { newOwnerId } = bodySchema.parse(req.body);
    const client = requireSupabaseAdmin();

    const { data: profile, error: profileError } = await client
      .from("teacher_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();
    if (profileError || !profile) {
      return res.status(404).send("Teacher profile not found.");
    }

    const { error } = await client
      .from("classes")
      .update({ owner_id: newOwnerId })
      .eq("owner_id", profile.id);

    if (error) {
      return res.status(400).send(error.message);
    }

    return res.json({ reassigned: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reassign classes.";
    return res.status(400).send(message);
  }
});

router.post("/teachers/:authUserId/archive", async (req, res) => {
  const bodySchema = z.object({
    reassignTo: z.string().uuid().nullable().optional(),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await requireAdminUser(token);
    const authUserId = z.string().uuid().parse(req.params.authUserId);
    const { reassignTo } = bodySchema.parse(req.body);
    const client = requireSupabaseAdmin();

    const { data: profile, error: profileError } = await client
      .from("teacher_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();
    if (profileError || !profile) {
      return res.status(404).send("Teacher profile not found.");
    }

    const { data: classes } = await client
      .from("classes")
      .select("id")
      .eq("owner_id", profile.id);

    if ((classes?.length ?? 0) > 0) {
      if (!reassignTo) {
        return res.status(409).send("Reassign classes before archiving this teacher.");
      }
      const { error: updateError } = await client
        .from("classes")
        .update({ owner_id: reassignTo })
        .eq("owner_id", profile.id);
      if (updateError) {
        return res.status(400).send(updateError.message);
      }
    }

    const { error: archiveError } = await client
      .from("teacher_profiles")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (archiveError) {
      return res.status(400).send(archiveError.message);
    }

    await client.auth.admin.updateUserById(authUserId, {
      user_metadata: { role: "revoked" },
    });

    return res.json({ archived: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive teacher.";
    return res.status(400).send(message);
  }
});

router.post("/teachers/:authUserId/delete", async (req, res) => {
  const bodySchema = z.object({
    reassignTo: z.string().uuid().nullable().optional(),
  });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await requireAdminUser(token);
    const authUserId = z.string().uuid().parse(req.params.authUserId);
    const { reassignTo } = bodySchema.parse(req.body);
    const client = requireSupabaseAdmin();

    const { data: profile, error: profileError } = await client
      .from("teacher_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();
    if (profileError || !profile) {
      return res.status(404).send("Teacher profile not found.");
    }

    const { data: classes } = await client
      .from("classes")
      .select("id")
      .eq("owner_id", profile.id);

    if ((classes?.length ?? 0) > 0) {
      if (!reassignTo) {
        return res.status(409).send("Reassign classes before deleting this teacher.");
      }
      const { error: updateError } = await client
        .from("classes")
        .update({ owner_id: reassignTo })
        .eq("owner_id", profile.id);
      if (updateError) {
        return res.status(400).send(updateError.message);
      }
    }

    const { error: deleteProfileError } = await client
      .from("teacher_profiles")
      .delete()
      .eq("id", profile.id);
    if (deleteProfileError) {
      return res.status(400).send(deleteProfileError.message);
    }

    const { error: deleteAuthError } = await client.auth.admin.deleteUser(authUserId);
    if (deleteAuthError) {
      return res.status(400).send(deleteAuthError.message);
    }

    return res.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete teacher.";
    return res.status(400).send(message);
  }
});

export default router;
