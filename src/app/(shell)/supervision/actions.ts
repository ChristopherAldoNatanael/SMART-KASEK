"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  createSupervision,
  updateSupervision,
} from "@/services/supervision.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  createSupervisionSchema,
  firstIssueMessage,
  updateSupervisionStatusSchema,
} from "@/schemas/supervision";

export type SupervisionActionState = {
  ok: boolean;
  error: string | null;
};

function fail(error: string): SupervisionActionState {
  return { ok: false, error };
}

function succeed(): SupervisionActionState {
  return { ok: true, error: null };
}

async function requireSupervisionMutation(): Promise<
  { user: CurrentUser; error: null } | { user: null; error: string }
> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { user: null, error: "Akun Anda belum terhubung ke sekolah" };
  }
  if (!hasRole(user.role, "principal")) {
    return {
      user: null,
      error: "Hanya Kepala Sekolah yang dapat mengubah data supervisi",
    };
  }
  return { user, error: null };
}

/**
 * Create a supervision with optional scored indicators.
 * Overall score is computed by the service from item scores.
 */
export async function createSupervisionAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = createSupervisionSchema.safeParse({
    teacherId: formData.get("teacherId"),
    supervisionDate: formData.get("supervisionDate"),
    type: formData.get("type"),
    summary: formData.get("summary"),
    strengths: formData.get("strengths"),
    improvements: formData.get("improvements"),
    status: formData.get("status"),
    itemsJson: formData.get("itemsJson"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    const supervision = await createSupervision({
      teacherId: parsed.data.teacherId,
      supervisionDate: parsed.data.supervisionDate,
      type: parsed.data.type,
      summary: parsed.data.summary,
      strengths: parsed.data.strengths,
      improvements: parsed.data.improvements,
      status: parsed.data.status,
      items: parsed.data.itemsJson.map((item) => ({
        indicator: item.indicator,
        category: item.category,
        score: item.score,
        observation: item.observation,
        recommendation: item.recommendation,
      })),
    });

    await logAuditEvent({
      action: "create",
      entity: "supervisions",
      entityId: supervision.id,
      newData: {
        teacher_id: supervision.teacher_id,
        status: supervision.status,
      },
    });
  } catch (error) {
    console.error("createSupervisionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal membuat supervisi"
    );
  }

  revalidatePath("/supervision");
  redirect("/supervision");
}

/**
 * Update a supervision's status.
 */
export async function updateSupervisionStatusAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = updateSupervisionStatusSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    await updateSupervision(parsed.data.supervisionId, {
      status: parsed.data.status,
    });

    await logAuditEvent({
      action: "update",
      entity: "supervisions",
      entityId: parsed.data.supervisionId,
      newData: { status: parsed.data.status },
    });
  } catch (error) {
    console.error("updateSupervisionStatusAction error:", error);
    return fail(
      error instanceof Error
        ? error.message
        : "Gagal memperbarui status supervisi"
    );
  }

  revalidatePath("/supervision");
  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return succeed();
}
