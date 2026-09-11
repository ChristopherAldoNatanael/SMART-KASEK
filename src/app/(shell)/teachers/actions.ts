"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  upsertTeacherCompetency,
} from "@/services/competency.service";
import { recalculateTeacherGrowth } from "@/services/growth.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  firstIssueMessage,
  upsertCompetencySchema,
} from "@/schemas/competency";
import {
  firstIssueMessage as teachingIssueMessage,
  updateTeachingSchema,
} from "@/schemas/teacher";
import { updateTeacher } from "@/services/teacher.service";

export type TeacherActionState = {
  ok: boolean;
  error: string | null;
};

/**
 * Save a teacher's competency score (principal only).
 * Refreshes the growth snapshot so impact is visible immediately.
 */
export async function saveCompetencyAction(
  _prev: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { ok: false, error: "Akun Anda belum terhubung ke sekolah." };
  }
  if (!hasRole(user.role, "principal")) {
    return { ok: false, error: "Hanya Kepala Sekolah yang dapat menilai kompetensi." };
  }

  const parsed = upsertCompetencySchema.safeParse({
    teacherId: formData.get("teacherId"),
    competencyId: formData.get("competencyId"),
    score: formData.get("score"),
    source: formData.get("source"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const saved = await upsertTeacherCompetency({
      teacherId: parsed.data.teacherId,
      competencyId: parsed.data.competencyId,
      score: parsed.data.score,
      source: parsed.data.source,
      notes: parsed.data.notes,
    });

    try {
      await recalculateTeacherGrowth(parsed.data.teacherId);
    } catch (error) {
      console.error("recalculateTeacherGrowth error:", error);
    }

    await logAuditEvent({
      action: "create",
      entity: "teacher_competencies",
      entityId: saved.id,
      newData: {
        teacher_id: parsed.data.teacherId,
        score: parsed.data.score,
      },
    });
  } catch (error) {
    console.error("saveCompetencyAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan nilai",
    };
  }

  revalidatePath(`/teachers/${parsed.data.teacherId}`);
  revalidatePath("/growth");
  return { ok: true, error: null };
}

/**
 * Update a teacher's subject + homeroom assignment (principal only).
 * Empty homeroom clears the Wali Kelas status (single source: teachers row).
 */
export async function updateTeachingAction(
  _prev: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { ok: false, error: "Akun Anda belum terhubung ke sekolah." };
  }
  if (!hasRole(user.role, "principal")) {
    return { ok: false, error: "Hanya Kepala Sekolah yang dapat mengubah data mengajar." };
  }

  const parsed = updateTeachingSchema.safeParse({
    teacherId: formData.get("teacherId"),
    subject: formData.get("subject"),
    homeroomClass: formData.get("homeroomClass"),
    nip: formData.get("nip"),
  });
  if (!parsed.success) {
    return { ok: false, error: teachingIssueMessage(parsed.error) };
  }

  try {
    await updateTeacher(parsed.data.teacherId, {
      // undefined = keep, null = clear (schema semantics above)
      ...(parsed.data.subject !== undefined
        ? { subject: parsed.data.subject }
        : {}),
      ...(parsed.data.homeroomClass !== undefined
        ? { homeroomClass: parsed.data.homeroomClass }
        : {}),
      ...(parsed.data.nip !== undefined ? { nip: parsed.data.nip } : {}),
    });

    await logAuditEvent({
      action: "update",
      entity: "teachers",
      entityId: parsed.data.teacherId,
      newData: {
        subject: parsed.data.subject ?? null,
        homeroom_class: parsed.data.homeroomClass ?? null,
        nip: parsed.data.nip ?? null,
      },
    });
  } catch (error) {
    console.error("updateTeachingAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan",
    };
  }

  revalidatePath(`/teachers/${parsed.data.teacherId}`);
  revalidatePath("/teachers");
  return { ok: true, error: null };
}
