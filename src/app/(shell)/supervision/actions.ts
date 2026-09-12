"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  addSupervisionItems,
  createSupervision,
  deleteSupervision,
  deleteSupervisionItem,
  updateSupervision,
} from "@/services/supervision.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  deleteSupervisionItemSchema,
  firstIssueMessage,
  saveAssessmentSchema,
  scheduleSupervisionSchema,
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
 * Menjadwalkan supervisi (Kepala Sekolah): cukup guru + tanggal + tipe.
 * Selalu tersimpan sebagai draft tanpa nilai. Guru kemudian melengkapi
 * 12 dokumen di halaman detail, baru Kepala Sekolah menilai di sana.
 */
export async function scheduleSupervisionAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = scheduleSupervisionSchema.safeParse({
    teacherId: formData.get("teacherId"),
    supervisionDate: formData.get("supervisionDate"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  let supervisionId: string;
  try {
    const supervision = await createSupervision({
      teacherId: parsed.data.teacherId,
      supervisionDate: parsed.data.supervisionDate,
      type: parsed.data.type,
      status: "draft",
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
    supervisionId = supervision.id;
  } catch (error) {
    console.error("scheduleSupervisionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menjadwalkan supervisi"
    );
  }

  revalidatePath("/supervision");
  redirect(`/supervision/${supervisionId}`);
}

/**
 * Menyimpan penilaian susulan di halaman detail (Kepala Sekolah):
 * tambah indikator + perbarui ringkasan/kekuatan/perlu ditingkatkan.
 * Skor keseluruhan dihitung ulang otomatis oleh service.
 */
export async function saveSupervisionAssessmentAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = saveAssessmentSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    summary: formData.get("summary"),
    strengths: formData.get("strengths"),
    improvements: formData.get("improvements"),
    itemsJson: formData.get("itemsJson"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    await addSupervisionItems(parsed.data.supervisionId, {
      items: parsed.data.itemsJson.map((item) => ({
        indicator: item.indicator,
        category: item.category,
        score: item.score,
        observation: item.observation,
        recommendation: item.recommendation,
      })),
      summary: parsed.data.summary,
      strengths: parsed.data.strengths,
      improvements: parsed.data.improvements,
    });

    await logAuditEvent({
      action: "update",
      entity: "supervisions",
      entityId: parsed.data.supervisionId,
      newData: { assessment_items_added: parsed.data.itemsJson.length },
    });
  } catch (error) {
    console.error("saveSupervisionAssessmentAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menyimpan penilaian"
    );
  }

  revalidatePath("/supervision");
  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return succeed();
}

/**
 * Hapus satu indikator penilaian (Kepala Sekolah).
 */
export async function deleteSupervisionItemAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = deleteSupervisionItemSchema.safeParse({
    itemId: formData.get("itemId"),
    supervisionId: formData.get("supervisionId"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  try {
    await deleteSupervisionItem(parsed.data.supervisionId, parsed.data.itemId);
    await logAuditEvent({
      action: "delete",
      entity: "supervision_items",
      entityId: parsed.data.itemId,
    });
  } catch (error) {
    console.error("deleteSupervisionItemAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menghapus indikator"
    );
  }

  revalidatePath("/supervision");
  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return succeed();
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

/**
 * Delete a supervision (principal only, enforced in service).
 */
export async function deleteSupervisionAction(
  _prev: { ok: boolean; error: string | null },
  formData: FormData
): Promise<{ ok: boolean; error: string | null }> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const id = formData.get("supervisionId");
  if (typeof id !== "string" || !id) return fail("Supervisi tidak valid");

  try {
    await deleteSupervision(id);
    await logAuditEvent({ action: "delete", entity: "supervisions", entityId: id });
  } catch (error) {
    console.error("deleteSupervisionAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menghapus supervisi"
    );
  }

  revalidatePath("/supervision");
  redirect("/supervision");
}
