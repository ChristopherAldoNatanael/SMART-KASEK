"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createLessonPlan, deleteLessonPlan, updateLessonPlan } from "@/services/lesson.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  createLessonPlanSchema,
  deleteLessonPlanSchema,
  firstIssueMessage,
  updateLessonPlanSchema,
} from "@/schemas/learning";

export type LearningActionState = {
  ok: boolean;
  error: string | null;
};

export async function createLessonPlanAction(
  _prev: LearningActionState,
  formData: FormData
): Promise<LearningActionState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { ok: false, error: "Akun Anda belum terhubung ke sekolah" };
  }

  const parsed = createLessonPlanSchema.safeParse({
    teacherId: formData.get("teacherId"),
    title: formData.get("title"),
    subject: formData.get("subject"),
    className: formData.get("className"),
    semester: formData.get("semester"),
    description: formData.get("description"),
    fileUrl: formData.get("fileUrl"),
    docUrl: formData.get("docUrl"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const plan = await createLessonPlan({
      teacherId: parsed.data.teacherId,
      title: parsed.data.title,
      subject: parsed.data.subject,
      className: parsed.data.className,
      semester: parsed.data.semester,
      description: parsed.data.description,
      fileUrl: parsed.data.fileUrl,
      docUrl: parsed.data.docUrl,
      status: parsed.data.status,
    });

    await logAuditEvent({
      action: "create",
      entity: "lesson_plans",
      entityId: plan.id,
      newData: { teacher_id: plan.teacher_id, title: plan.title },
    });
  } catch (error) {
    console.error("createLessonPlanAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan modul ajar",
    };
  }

  revalidatePath("/learning");
  redirect("/learning");
}

/**
 * Update a lesson plan. Owner or principal (enforced in service).
 */
export async function updateLessonPlanAction(
  _prev: LearningActionState,
  formData: FormData
): Promise<LearningActionState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { ok: false, error: "Akun Anda belum terhubung ke sekolah" };
  }

  const parsed = updateLessonPlanSchema.safeParse({
    lessonId: formData.get("lessonId"),
    title: formData.get("title"),
    subject: formData.get("subject"),
    className: formData.get("className"),
    semester: formData.get("semester"),
    description: formData.get("description"),
    fileUrl: formData.get("fileUrl"),
    docUrl: formData.get("docUrl"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const plan = await updateLessonPlan(parsed.data.lessonId, {
      title: parsed.data.title,
      ...(parsed.data.subject !== undefined
        ? { subject: parsed.data.subject }
        : {}),
      ...(parsed.data.className !== undefined
        ? { className: parsed.data.className }
        : {}),
      ...(parsed.data.semester !== undefined
        ? { semester: parsed.data.semester }
        : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.fileUrl !== undefined
        ? { fileUrl: parsed.data.fileUrl }
        : {}),
      ...(parsed.data.docUrl !== undefined
        ? { docUrl: parsed.data.docUrl }
        : {}),
      status: parsed.data.status,
    });

    await logAuditEvent({
      action: "update",
      entity: "lesson_plans",
      entityId: plan.id,
      newData: { title: plan.title, status: plan.status },
    });
  } catch (error) {
    console.error("updateLessonPlanAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan perubahan",
    };
  }

  revalidatePath("/learning");
  redirect("/learning");
}

export async function deleteLessonPlanAction(
  _prev: LearningActionState,
  formData: FormData
): Promise<LearningActionState> {
  const parsed = deleteLessonPlanSchema.safeParse({
    lessonId: formData.get("lessonId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await deleteLessonPlan(parsed.data.lessonId);
    await logAuditEvent({
      action: "delete",
      entity: "lesson_plans",
      entityId: parsed.data.lessonId,
    });
  } catch (error) {
    console.error("deleteLessonPlanAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus modul ajar",
    };
  }

  revalidatePath("/learning");
  return { ok: true, error: null };
}
