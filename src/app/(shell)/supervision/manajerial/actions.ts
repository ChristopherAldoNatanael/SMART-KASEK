"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  createManagerialSupervision,
  finalizeManagerialInstrument,
  finalizeManagerialOverall,
  saveManagerialDraft,
  saveManagerialFollowUp,
} from "@/services/supervision-managerial.service";
import { logAuditEvent } from "@/services/audit.service";
import type { ManagerialInstrumentKey } from "@/lib/supervision-managerial";
import {
  finalizeManagerialInstrumentSchema,
  firstManagerialIssueMessage,
  saveManagerialFollowUpSchema,
  saveManagerialI1Schema,
  saveManagerialI2Schema,
  saveManagerialI3Schema,
  scheduleManagerialSchema,
} from "@/schemas/supervision-managerial";

export type ManagerialActionState = {
  ok: boolean;
  error: string | null;
};

function fail(error: string): ManagerialActionState {
  return { ok: false, error };
}

function succeed(): ManagerialActionState {
  return { ok: true, error: null };
}

async function requireManagerialMutation(): Promise<
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

function revalidateManagerial(id: string) {
  revalidatePath("/supervision");
  revalidatePath("/supervision/manajerial");
  revalidatePath(`/supervision/manajerial/${id}`);
}

/**
 * Membuat supervisi manajerial: pilih guru + tahun pelajaran/periode.
 * Tersimpan sebagai draft — pengisian Instrumen 1–3 di halaman detail.
 */
export async function scheduleManagerialAction(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const gate = await requireManagerialMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = scheduleManagerialSchema.safeParse({
    teacherId: formData.get("teacherId"),
    supervisionDate: formData.get("supervisionDate"),
    academicYear: formData.get("academicYear"),
    period: formData.get("period"),
  });
  if (!parsed.success) return fail(firstManagerialIssueMessage(parsed.error));

  let supervisionId: string;
  try {
    const supervision = await createManagerialSupervision({
      teacherId: parsed.data.teacherId,
      supervisionDate: parsed.data.supervisionDate,
      academicYear: parsed.data.academicYear,
      period: parsed.data.period,
    });
    await logAuditEvent({
      action: "create",
      entity: "supervisions",
      entityId: supervision.id,
      newData: {
        kind: "managerial",
        teacher_id: supervision.teacher_id,
        academic_year: supervision.academic_year,
      },
    });
    supervisionId = supervision.id;
  } catch (error) {
    console.error("scheduleManagerialAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal membuat supervisi manajerial"
    );
  }

  revalidatePath("/supervision/manajerial");
  redirect(`/supervision/manajerial/${supervisionId}`);
}

/** Simpan draft satu instrumen (parsial OK). */
async function saveInstrumentDraft(
  supervisionId: string,
  instrument: ManagerialInstrumentKey,
  rawItems: unknown[]
): Promise<ManagerialActionState> {
  const gate = await requireManagerialMutation();
  if (!gate.user) return fail(gate.error);

  try {
    const assessment = await saveManagerialDraft(
      supervisionId,
      instrument,
      rawItems as never
    );
    await logAuditEvent({
      action: "update",
      entity: "supervision_managerial_assessments",
      entityId: assessment.id,
      newData: { supervision_id: supervisionId, instrument, status: "draft" },
    });
  } catch (error) {
    console.error("saveManagerialDraftAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan draft");
  }

  revalidateManagerial(supervisionId);
  return succeed();
}

export async function saveManagerialI1Action(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const parsed = saveManagerialI1Schema.safeParse({
    supervisionId: formData.get("supervisionId"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstManagerialIssueMessage(parsed.error));
  return saveInstrumentDraft(
    parsed.data.supervisionId,
    "i1",
    parsed.data.itemsJson
  );
}

export async function saveManagerialI2Action(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const parsed = saveManagerialI2Schema.safeParse({
    supervisionId: formData.get("supervisionId"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstManagerialIssueMessage(parsed.error));
  return saveInstrumentDraft(
    parsed.data.supervisionId,
    "i2",
    parsed.data.itemsJson
  );
}

export async function saveManagerialI3Action(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const parsed = saveManagerialI3Schema.safeParse({
    supervisionId: formData.get("supervisionId"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstManagerialIssueMessage(parsed.error));
  return saveInstrumentDraft(
    parsed.data.supervisionId,
    "i3",
    parsed.data.itemsJson
  );
}

/**
 * Finalisasi satu instrumen: nilai terkini dari layar ikut disimpan dulu
 * (seperti pola instrumen akademik), lalu difinalisasi.
 */
export async function finalizeManagerialInstrumentAction(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const gate = await requireManagerialMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = finalizeManagerialInstrumentSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    instrument: formData.get("instrument"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstManagerialIssueMessage(parsed.error));

  const { supervisionId, instrument } = parsed.data;
  try {
    // Simpan nilai layar terlebih dahulu agar finalisasi membaca data terbaru.
    const raw = parsed.data.itemsJson ? JSON.parse(parsed.data.itemsJson) : [];
    if (Array.isArray(raw) && raw.length > 0) {
      await saveManagerialDraft(
        supervisionId,
        instrument as ManagerialInstrumentKey,
        raw as never
      );
    }
    const assessment = await finalizeManagerialInstrument(
      supervisionId,
      instrument as ManagerialInstrumentKey
    );
    await logAuditEvent({
      action: "update",
      entity: "supervision_managerial_assessments",
      entityId: assessment.id,
      newData: { supervision_id: supervisionId, instrument, status: "final" },
    });
  } catch (error) {
    console.error("finalizeManagerialInstrumentAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menyelesaikan instrumen"
    );
  }

  revalidateManagerial(supervisionId);
  return succeed();
}

/** Finalisasi keseluruhan (wajib I1 + I2 + I3 final). */
export async function finalizeManagerialOverallAction(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const gate = await requireManagerialMutation();
  if (!gate.user) return fail(gate.error);

  const id = formData.get("supervisionId");
  if (typeof id !== "string" || !id) return fail("Supervisi tidak valid");

  try {
    const assessment = await finalizeManagerialOverall(id);
    await logAuditEvent({
      action: "update",
      entity: "supervision_managerial_assessments",
      entityId: assessment.id,
      newData: {
        supervision_id: id,
        status: "final",
        overall_value: assessment.overall_value,
      },
    });
  } catch (error) {
    console.error("finalizeManagerialOverallAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal memfinalisasi supervisi"
    );
  }

  revalidateManagerial(id);
  return succeed();
}

/** Simpan catatan & tindak lanjut. */
export async function saveManagerialFollowUpAction(
  _prev: ManagerialActionState,
  formData: FormData
): Promise<ManagerialActionState> {
  const gate = await requireManagerialMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = saveManagerialFollowUpSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    findings: formData.get("findings"),
    supervisorNotes: formData.get("supervisorNotes"),
    followUpRecommendation: formData.get("followUpRecommendation"),
    improvementTarget: formData.get("improvementTarget"),
    followUpStatus: formData.get("followUpStatus"),
  });
  if (!parsed.success) return fail(firstManagerialIssueMessage(parsed.error));

  try {
    const assessment = await saveManagerialFollowUp({
      supervisionId: parsed.data.supervisionId,
      findings: parsed.data.findings,
      supervisorNotes: parsed.data.supervisorNotes,
      followUpRecommendation: parsed.data.followUpRecommendation,
      improvementTarget: parsed.data.improvementTarget,
      followUpStatus: parsed.data.followUpStatus,
    });
    await logAuditEvent({
      action: "update",
      entity: "supervision_managerial_assessments",
      entityId: assessment.id,
      newData: {
        supervision_id: parsed.data.supervisionId,
        follow_up_status: assessment.follow_up_status,
      },
    });
  } catch (error) {
    console.error("saveManagerialFollowUpAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menyimpan tindak lanjut"
    );
  }

  revalidateManagerial(parsed.data.supervisionId);
  return succeed();
}
