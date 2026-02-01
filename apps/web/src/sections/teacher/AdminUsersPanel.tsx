import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  archiveTeacher,
  deleteTeacher,
  fetchAdminInvites,
  fetchAdminTeachers,
  reassignTeacherClasses,
  revokeTeacherInvite,
  sendTeacherInvite,
  type AdminInvite,
  type AdminTeacher,
} from "../../services/adminApi";
import useSupabaseSession from "../../hooks/useSupabaseSession";

const AdminUsersPanel = () => {
  const { user } = useSupabaseSession();
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reassignSelections, setReassignSelections] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teacherData, inviteData] = await Promise.all([
        fetchAdminTeachers(),
        fetchAdminInvites(),
      ]);
      setTeachers(teacherData);
      setInvites(inviteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const availableReassignTargets = useMemo(
    () =>
      teachers.filter(
        (teacher) =>
          teacher.teacherProfileId &&
          !teacher.archivedAt &&
          teacher.role !== "revoked",
      ),
    [teachers],
  );

  const handleInviteSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) {
      return;
    }
    try {
      setInviteStatus(null);
      setBusyId("invite");
      const { emailSent } = await sendTeacherInvite(trimmed);
      setInviteStatus(
        emailSent
          ? `Invite sent to ${trimmed}.`
          : `Invite saved for ${trimmed}. Supabase email could not be sent.`,
      );
      setInviteEmail("");
      await refresh();
    } catch (err) {
      setInviteStatus(
        err instanceof Error ? err.message : "Unable to send invite.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReassign = async (teacher: AdminTeacher) => {
    if (!teacher.teacherProfileId) {
      return;
    }
    const target = reassignSelections[teacher.authUserId];
    if (!target) {
      setError("Choose a teacher to receive these classes.");
      return;
    }
    try {
      setBusyId(teacher.authUserId);
      setError(null);
      await reassignTeacherClasses(teacher.authUserId, target);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reassign classes.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (teacher: AdminTeacher) => {
    if (!teacher.teacherProfileId) {
      return;
    }
    const needsReassign = teacher.classCount > 0;
    const target = reassignSelections[teacher.authUserId] || null;

    if (needsReassign && !target) {
      setError("Reassign classes before archiving this teacher.");
      return;
    }

    if (!window.confirm(`Archive ${teacher.email ?? "this teacher"}?`)) {
      return;
    }

    try {
      setBusyId(teacher.authUserId);
      setError(null);
      await archiveTeacher(teacher.authUserId, target ?? undefined);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to archive teacher.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (teacher: AdminTeacher) => {
    if (!teacher.teacherProfileId) {
      return;
    }
    const needsReassign = teacher.classCount > 0;
    const target = reassignSelections[teacher.authUserId] || null;

    if (needsReassign && !target) {
      setError("Reassign classes before deleting this teacher.");
      return;
    }

    if (
      !window.confirm(
        `Delete ${teacher.email ?? "this teacher"}? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setBusyId(teacher.authUserId);
      setError(null);
      await deleteTeacher(teacher.authUserId, target ?? undefined);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete teacher.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeInvite = async (invite: AdminInvite) => {
    if (!window.confirm(`Revoke invite for ${invite.email}?`)) {
      return;
    }
    try {
      setBusyId(invite.id);
      setError(null);
      await revokeTeacherInvite(invite.id);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to revoke invite.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Admin users</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Manage teacher access, invites, and class ownership
          </p>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {teachers.length} teacher{teachers.length === 1 ? "" : "s"}
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <form
          onSubmit={handleInviteSubmit}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invite a teacher
          </p>
          <label className="mt-2 block text-xs font-medium text-slate-600">
            Teacher email
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@school.org"
              required
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            />
          </label>
          <button
            type="submit"
            disabled={busyId === "invite"}
            className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Send invite
          </button>
          {inviteStatus ? (
            <p className="mt-3 text-xs text-slate-600">{inviteStatus}</p>
          ) : null}
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Invites</h3>
            <span className="text-xs text-slate-500">
              {invites.length} total
            </span>
          </div>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading invites...</p>
          ) : invites.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No invites yet. Use the form to send a new invite.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-md border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-slate-900">{invite.email}</div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {invite.status}
                    </span>
                    <div className="ml-auto flex flex-wrap gap-2 text-xs">
                      {invite.status !== "revoked" ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(invite)}
                          disabled={busyId === invite.id}
                          className="font-semibold text-rose-600 hover:underline disabled:text-rose-300"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Invited {invite.invited_at ? new Date(invite.invited_at).toLocaleString() : "-"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Teacher accounts</h3>
          <span className="text-xs text-slate-500">
            Manage access and class ownership
          </span>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading teachers...</p>
        ) : teachers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No teachers found.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {teachers.map((teacher) => {
              const isSelf = user?.id === teacher.authUserId;
              const disableActions = busyId === teacher.authUserId || isSelf;
              const targets = availableReassignTargets.filter(
                (candidate) => candidate.authUserId !== teacher.authUserId,
              );
              return (
                <li
                  key={teacher.authUserId}
                  className="rounded-md border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <div className="font-medium text-slate-900">
                        {teacher.email ?? "(No email)"}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-semibold text-slate-500">
                            (You)
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        Role: {teacher.role ?? "unknown"}
                        {teacher.archivedAt ? " - archived" : ""}
                      </div>
                    </div>
                    <div className="ml-auto text-xs text-slate-500">
                      {teacher.activeClassCount} active class
                      {teacher.activeClassCount === 1 ? "" : "es"}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
                    <label className="text-xs font-medium text-slate-600">
                      Reassign classes to
                      <select
                        value={reassignSelections[teacher.authUserId] ?? ""}
                        onChange={(event) =>
                          setReassignSelections((current) => ({
                            ...current,
                            [teacher.authUserId]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700"
                      >
                        <option value="">Select teacher</option>
                        {targets.map((target) => (
                          <option key={target.authUserId} value={target.teacherProfileId ?? ""}>
                            {target.email ?? "Unknown"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleReassign(teacher)}
                      disabled={disableActions || targets.length === 0}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Reassign
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(teacher)}
                      disabled={disableActions}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(teacher)}
                      disabled={disableActions}
                      className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminUsersPanel;
