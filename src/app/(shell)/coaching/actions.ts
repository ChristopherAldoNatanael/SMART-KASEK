"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  addCoachingAction,
  createCoachingSession,
  deleteCoachingSession,
  getCoachingSessionById,
  updateCoachingAction,
  updateCoachingSession,
} from "@/services/coaching.service";
import { recalculateTeacherGrowth } from "@/services/growth.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  addCoachingActionSchema,
  createCoachingSessionSchema,
  firstIssueMessage,
  updateCoachingActionSchema,
  updateSessionStatusSchema,
} from "@/schemas/coaching";

export type CoachingActionState = {
  ok: boolean;
  error: string | null;
};

function fail(error: string): CoachingActionState {
  return { ok: false, error };
}

function succeed(): CoachingActionState {
  return { ok: true, error: null };
}

/**
 * Only the principal may mutate coaching data.
 * (Legacy 'admin' role is accepted by hasRole for compatibility,
 * but no admin UX exists.)
 */
async function requireCoachMutation(): Promise<
  { user: CurrentUser; error: null } | { user: null; error: string }
> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { user: null, error: "Akun Anda belum terhubung ke sekolah" };
  }
  if (!hasRole(user.role, "principal")) {
    return { user: null, error: "Hanya Kepala Sekolah yang dapat mengubah data coaching" };
  }
  return { user, error: null };
}

/**
 * Create a coaching session with optional follow-up actions.
 * Redirects to the new session detail on success.
 */
export async function createSessionAction(
  _prev: CoachingActionState,
  formData: FormData
): Promise<CoachingActionState> {
  const gate = await requireCoachMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = createCoachingSessionSchema.safeParse({
    teacherId: formData.get("teacherId"),
    sessionDate: formData.get("sessionDate"),
    focusArea: formData.get("focusArea"),
    initialCondition: formData.get("initialCondition"),
    discussion: formData.get("discussion"),
    agreement: formData.get("agreement"),
    summary: formData.get("summary"),
    status: formData.get("status"),
    supervisionId: formData.get("supervisionId"),
    actionsJson: formData.get("actionsJson"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    const session = await createCoachingSession({
      teacherId: parsed.data.teacherId,
      sessionDate: parsed.data.sessionDate,
      focusArea: parsed.data.focusArea,
      initialCondition: parsed.data.initialCondition,
      discussion: parsed.data.discussion,
      agreement: parsed.data.agreement,
      summary: parsed.data.summary,
      status: parsed.data.status,
      supervisionId: parsed.data.supervisionId,
      actions: parsed.data.actionsJson.map((a) => ({
        action: a.action,
        targetDate: a.targetDate,
      })),
    });

    await logAuditEvent({
      action: "create",
      entity: "coaching_sessions",
      entityId: session.id,
      newData: { teacher_id: session.teacher_id, status: session.status },
    });
  } catch (error) {
    console.error("createSessionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal membuat sesi coaching"
    );
  }

  revalidatePath("/coaching");
  redirect("/coaching");
}

/**
 * Add a follow-up action to an existing session.
 */
export async function addActionAction(
  _prev: CoachingActionState,
  formData: FormData
): Promise<CoachingActionState> {
  const gate = await requireCoachMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = addCoachingActionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    action: formData.get("action"),
    targetDate: formData.get("targetDate"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    const created = await addCoachingAction({
      sessionId: parsed.data.sessionId,
      action: parsed.data.action,
      targetDate: parsed.data.targetDate,
    });

    await logAuditEvent({
      action: "create",
      entity: "coaching_actions",
      entityId: created.id,
      newData: { coaching_session_id: parsed.data.sessionId },
    });
  } catch (error) {
    console.error("addActionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menambahkan tindak lanjut"
    );
  }

  revalidatePath("/coaching");
  revalidatePath(`/coaching/${parsed.data.sessionId}`);
  return succeed();
}

/**
 * Update a follow-up action (status, evidence, result, notes).
 * Sets completed_date automatically when marked completed.
 */
export async function updateActionAction(
  _prev: CoachingActionState,
  formData: FormData
): Promise<CoachingActionState> {
  const gate = await requireCoachMutation();
  if (!gate.user) return fail(gate.error);

  const sessionId = formData.get("sessionId");

  const parsed = updateCoachingActionSchema.safeParse({
    actionId: formData.get("actionId"),
    status: formData.get("status"),
    evidence: formData.get("evidence"),
    result: formData.get("result"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    await updateCoachingAction(parsed.data.actionId, {
      status: parsed.data.status,
      evidence: parsed.data.evidence,
      result: parsed.data.result,
      notes: parsed.data.notes,
      ...(parsed.data.status === "completed"
        ? { completedDate: new Date().toISOString().split("T")[0] }
        : {}),
    });

    await logAuditEvent({
      action: "update",
      entity: "coaching_actions",
      entityId: parsed.data.actionId,
      newData: { status: parsed.data.status },
    });

    // Critical flow (AGENTS.md §31, §43): completing a follow-up
    // recalculates the teacher's growth snapshot from the database.
    // Growth failure must never break the follow-up completion itself.
    if (parsed.data.status === "completed") {
      try {
        const sessionIdValue =
          typeof sessionId === "string" && sessionId ? sessionId : null;
        const session = sessionIdValue
          ? await getCoachingSessionById(sessionIdValue)
          : null;
        if (session?.teacher_id) {
          await recalculateTeacherGrowth(session.teacher_id);
        }
      } catch (error) {
        console.error("recalculateTeacherGrowth error:", error);
      }
    }
  } catch (error) {
    console.error("updateActionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal memperbarui tindak lanjut"
    );
  }

  revalidatePath("/coaching");
  revalidatePath("/growth");
  if (typeof sessionId === "string" && sessionId) {
    revalidatePath(`/coaching/${sessionId}`);
  }
  return succeed();
}

/**
 * Delete a coaching session (principal only, enforced in service).
 */
export async function deleteSessionAction(
  _prev: CoachingActionState,
  formData: FormData
): Promise<CoachingActionState> {
  const gate = await requireCoachMutation();
  if (!gate.user) return fail(gate.error);

  const id = formData.get("sessionId");
  if (typeof id !== "string" || !id) return fail("Sesi coaching tidak valid");

  try {
    await deleteCoachingSession(id);
    await logAuditEvent({
      action: "delete",
      entity: "coaching_sessions",
      entityId: id,
    });
  } catch (error) {
    console.error("deleteSessionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menghapus sesi coaching"
    );
  }

  revalidatePath("/coaching");
  redirect("/coaching");
}

/**
 * Update a coaching session's status.
 */
export async function updateSessionStatusAction(
  _prev: CoachingActionState,
  formData: FormData
): Promise<CoachingActionState> {
  const gate = await requireCoachMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = updateSessionStatusSchema.safeParse({
    sessionId: formData.get("sessionId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    await updateCoachingSession(parsed.data.sessionId, {
      status: parsed.data.status,
    });

    await logAuditEvent({
      action: "update",
      entity: "coaching_sessions",
      entityId: parsed.data.sessionId,
      newData: { status: parsed.data.status },
    });
  } catch (error) {
    console.error("updateSessionStatusAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal memperbarui status sesi"
    );
  }

  revalidatePath("/coaching");
  revalidatePath(`/coaching/${parsed.data.sessionId}`);
  return succeed();
}
