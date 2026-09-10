"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createLessonPlan, deleteLessonPlan } from "@/services/lesson.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  createLessonPlanSchema,
  deleteLessonPlanSchema,
  firstIssueMessage,
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
