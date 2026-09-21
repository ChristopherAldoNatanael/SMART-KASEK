"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  createSupervision,
  deleteSupervision,
  updateSupervision,
} from "@/services/supervision.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  finalizeInstrumentAssessment,
  saveInstrumentDraft,
  syncSupervisionToCompetencies,
} from "@/services/instrument-assessment.service";
import type { SupervisionDocType } from "@/lib/supervision-docs";
import {
  finalizeInstrumentSchema,
  firstIssueMessage as firstInstrumentIssue,
  saveInstrumentDraftSchema,
} from "@/schemas/instrument-assessment";
import {
  firstIssueMessage,
  scheduleSupervisionSchema,
  updateSupervisionScheduleSchema,
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
 * Menjadwalkan supervisi (Kepala Sekolah): guru + tanggal + tipe
 * + tahun pelajaran. Selalu tersimpan sebagai draft tanpa nilai.
 * Guru kemudian melengkapi 12 dokumen di halaman detail, baru
 * Kepala Sekolah menilai di sana.
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
    academicYear: formData.get("academicYear"),
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
      academicYear: parsed.data.academicYear,
      status: "draft",
    });

    await logAuditEvent({
      action: "create",
      entity: "supervisions",
      entityId: supervision.id,
      newData: {
        teacher_id: supervision.teacher_id,
        status: supervision.status,
        academic_year: supervision.academic_year,
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
 * Mengubah jadwal supervisi (Kepala Sekolah): guru + tanggal + tipe
 * + tahun pelajaran. Field teks yang dikosongkan berarti hapus isi
 * (tipe) atau ikuti tanggal baru (tahun pelajaran).
 */
export async function updateSupervisionScheduleAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = updateSupervisionScheduleSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    teacherId: formData.get("teacherId"),
    supervisionDate: formData.get("supervisionDate"),
    type: formData.get("type"),
    academicYear: formData.get("academicYear"),
  });

  if (!parsed.success) {
    return fail(firstIssueMessage(parsed.error));
  }

  // Skema mengubah string kosong menjadi undefined; di sini undefined
  // punya arti eksplisit: tipe → hapus isi, tahun → ikuti tanggal baru.
  const rawType = formData.get("type");
  const rawYear = formData.get("academicYear");

  try {
    const supervision = await updateSupervision(parsed.data.supervisionId, {
      teacherId: parsed.data.teacherId,
      supervisionDate: parsed.data.supervisionDate,
      type:
        typeof rawType === "string" && rawType.trim() === ""
          ? null
          : parsed.data.type,
      academicYear:
        typeof rawYear === "string" && rawYear.trim() === ""
          ? ""
          : parsed.data.academicYear,
    });

    await logAuditEvent({
      action: "update",
      entity: "supervisions",
      entityId: supervision.id,
      newData: {
        teacher_id: supervision.teacher_id,
        supervision_date: supervision.supervision_date,
        type: supervision.type,
        academic_year: supervision.academic_year,
      },
    });
  } catch (error) {
    console.error("updateSupervisionScheduleAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menyimpan perubahan jadwal"
    );
  }

  revalidatePath("/supervision");
  redirect(`/supervision/${parsed.data.supervisionId}`);
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

/**
 * Simpan draft penilaian instrumen (Kepala Sekolah).
 * Parsial diperbolehkan — bisa dilanjutkan nanti, aman dari refresh
 * karena tersimpan di database.
 */
export async function saveInstrumentDraftAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = saveInstrumentDraftSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    className: formData.get("className"),
    evaluation: formData.get("evaluation"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstInstrumentIssue(parsed.error));

  try {
    const assessment = await saveInstrumentDraft({
      supervisionId: parsed.data.supervisionId,
      className: parsed.data.className,
      evaluation: parsed.data.evaluation,
      items: parsed.data.itemsJson.map((item) => ({
        docType: item.docType as SupervisionDocType,
        present: item.present,
        score: item.score,
        note: item.note,
      })),
    });
    await logAuditEvent({
      action: "update",
      entity: "supervision_instrument_assessments",
      entityId: assessment.id,
      newData: { supervision_id: assessment.supervision_id, status: "draft" },
    });
  } catch (error) {
    console.error("saveInstrumentDraftAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menyimpan draft"
    );
  }

  revalidatePath("/supervision");
  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return succeed();
}

/**
 * Finalisasi penilaian instrumen (Kepala Sekolah).
 * Nilai terkini dari layar ikut dikirim form sehingga aksi ini
 * menyimpan dulu (seperti draft) lalu memfinalisasi — pengguna tidak
 * wajib klik "Simpan Draft" sebelum "Selesaikan Penilaian".
 * Ditolak bila ada aspek tanpa skor 1-4.
 */
export async function finalizeInstrumentAction(
  _prev: SupervisionActionState,
  formData: FormData
): Promise<SupervisionActionState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user) return fail(gate.error);

  const parsed = finalizeInstrumentSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    className: formData.get("className"),
    evaluation: formData.get("evaluation"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstInstrumentIssue(parsed.error));

  try {
    // Simpan nilai yang tampil di layar terlebih dahulu agar finalisasi
    // membaca data terbaru, bukan draft lama di database.
    if (parsed.data.itemsJson.length > 0) {
      await saveInstrumentDraft({
        supervisionId: parsed.data.supervisionId,
        className: parsed.data.className,
        evaluation: parsed.data.evaluation,
        items: parsed.data.itemsJson.map((item) => ({
          docType: item.docType as SupervisionDocType,
          present: item.present,
          score: item.score,
          note: item.note,
        })),
      });
    }
    const assessment = await finalizeInstrumentAssessment(
      parsed.data.supervisionId
    );
    await logAuditEvent({
      action: "update",
      entity: "supervision_instrument_assessments",
      entityId: assessment.id,
      newData: {
        supervision_id: assessment.supervision_id,
        status: "final",
        total_score: assessment.total_score,
        final_value: assessment.final_value,
      },
    });
  } catch (error) {
    console.error("finalizeInstrumentAction error:", error);
    return fail(
      error instanceof Error ? error.message : "Gagal menyelesaikan penilaian"
    );
  }

  revalidatePath("/supervision");
  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return succeed();
}

export type SyncCompetencyState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

/**
 * Kirim (ulang) skor instrumen final ke profil guru (Kepala Sekolah).
 * Dipakai untuk supervisi yang diselesaikan sebelum jembatan otomatis
 * ada, atau bila pengiriman otomatis saat finalisasi gagal diam-diam.
 * Hasilnya eksplisit: jumlah dan rincian skor yang terkirim.
 */
export async function syncSupervisionCompetenciesAction(
  _prev: SyncCompetencyState,
  formData: FormData
): Promise<SyncCompetencyState> {
  const gate = await requireSupervisionMutation();
  if (!gate.user)
    return { ok: false, error: gate.error, message: null };

  const id = formData.get("supervisionId");
  if (typeof id !== "string" || !id)
    return { ok: false, error: "Supervisi tidak valid", message: null };

  try {
    const { teacherId, synced } = await syncSupervisionToCompetencies(id);

    await logAuditEvent({
      action: "sync",
      entity: "teacher_competencies",
      entityId: teacherId,
      newData: {
        supervision_id: id,
        synced: synced.map((s) => `${s.competency}: ${s.score}`),
      },
    });

    const detail = synced
      .map(
        (s) =>
          `${s.competency} ${s.score.toLocaleString("id-ID", {
            maximumFractionDigits: 2,
          })}`
      )
      .join(", ");
    revalidatePath("/supervision");
    revalidatePath(`/supervision/${id}`);
    revalidatePath(`/teachers/${teacherId}`);
    revalidatePath("/growth");
    return {
      ok: true,
      error: null,
      message: `${synced.length} skor terkirim ke profil guru — ${detail}.`,
    };
  } catch (error) {
    console.error("syncSupervisionCompetenciesAction error:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal mengirim ke profil guru",
      message: null,
    };
  }
}
