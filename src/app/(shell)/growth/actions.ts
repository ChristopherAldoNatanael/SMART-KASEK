"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { recalculateAllGrowth } from "@/services/growth.service";
import {
  createTraining,
  deleteTraining,
  updateTraining,
} from "@/services/training.service";
import {
  firstIssueMessage,
  trainingIdSchema,
  trainingSchema,
} from "@/schemas/training";
import { logAuditEvent } from "@/services/audit.service";

export type GrowthActionState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

/**
 * Hitung ulang snapshot periode berjalan untuk semua guru di sekolah
 * (Kepala Sekolah). Mengisi halaman /growth yang kosong dari data
 * kompetensi yang sudah ada — tanpa menunggu trigger otomatis.
 */
export async function recalculateAllAction(
  _prev: GrowthActionState
): Promise<GrowthActionState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return {
      ok: false,
      error: "Akun Anda belum terhubung ke sekolah",
      message: null,
    };
  }
  if (!hasRole(user.role, "principal")) {
    return {
      ok: false,
      error: "Hanya Kepala Sekolah yang dapat menghitung ulang",
      message: null,
    };
  }

  // Operasi berat (N guru × query) — tahan klik berulang.
  const recalcLimit = checkRateLimit(`recalc:${user.id}`, 5, 600_000);
  if (!recalcLimit.ok) {
    return {
      ok: false,
      error: `Terlalu sering menghitung ulang. Coba lagi dalam ${recalcLimit.retryAfterSec} detik.`,
      message: null,
    };
  }

  try {
    const result = await recalculateAllGrowth();

    await logAuditEvent({
      action: "recalculate",
      entity: "teacher_growth_snapshots",
      newData: {
        total: result.total,
        updated: result.updated,
        skipped: result.skipped,
      },
    });

    if (result.total === 0) {
      return {
        ok: true,
        error: null,
        message: "Belum ada data guru di sekolah ini.",
      };
    }
    if (result.updated === 0) {
      return {
        ok: true,
        error: null,
        message: `0 dari ${result.total} guru terhitung — semua belum punya data kompetensi. Isi nilai di Data Guru atau selesaikan supervisi dulu.`,
      };
    }
    const skippedNote =
      result.skipped > 0
        ? ` ${result.skipped} guru dilewati (belum ada data kompetensi).`
        : "";
    return {
      ok: true,
      error: null,
      message: `${result.updated} dari ${result.total} guru terhitung untuk periode berjalan.${skippedNote}`,
    };
  } catch (error) {
    console.error("recalculateAllAction error:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal menghitung ulang",
      message: null,
    };
  } finally {
    revalidatePath("/growth");
  }
}

export type TrainingActionState = {
  ok: boolean;
  error: string | null;
  trainingId: string | null;
};

function parseTrainingForm(formData: FormData) {
  return trainingSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    organizer: formData.get("organizer"),
    trainingDate: formData.get("trainingDate"),
    scheduleTime: formData.get("scheduleTime"),
    location: formData.get("location"),
    durationHours: formData.get("durationHours"),
    points: formData.get("points"),
    teacherIds: formData.getAll("teacherIds"),
  });
}

function requirePrincipalAction(user: { schoolId: string | null; role: string }) {
  if (!user.schoolId) {
    return "Akun Anda belum terhubung ke sekolah.";
  }
  if (!hasRole(user.role as "teacher" | "principal" | "admin", "principal")) {
    return "Hanya Kepala Sekolah yang dapat mengelola pelatihan.";
  }
  return null;
}

/**
 * Tambah kegiatan pelatihan + guru peserta (Kepala Sekolah).
 * Poin dimasukkan sekali per kegiatan; rekap per guru dihitung
 * otomatis dari relasi peserta (tanpa input ulang).
 */
export async function createTrainingAction(
  _prev: TrainingActionState,
  formData: FormData
): Promise<TrainingActionState> {
  const user = await requireUser();
  const denied = requirePrincipalAction(user);
  if (denied) return { ok: false, error: denied, trainingId: null };

  const parsed = parseTrainingForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error), trainingId: null };
  }

  try {
    const training = await createTraining({
      name: parsed.data.name,
      description: parsed.data.description,
      organizer: parsed.data.organizer,
      trainingDate: parsed.data.trainingDate,
      scheduleTime: parsed.data.scheduleTime,
      location: parsed.data.location,
      durationHours: parsed.data.durationHours,
      points: parsed.data.points,
      teacherIds: parsed.data.teacherIds,
    });

    await logAuditEvent({
      action: "create",
      entity: "trainings",
      entityId: training.id,
      newData: { name: training.name, points: training.points },
    });

    revalidatePath("/growth");
    return { ok: true, error: null, trainingId: training.id };
  } catch (error) {
    console.error("createTrainingAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menambah pelatihan",
      trainingId: null,
    };
  }
}

/**
 * Ubah kegiatan pelatihan + sinkronisasi peserta (Kepala Sekolah).
 */
export async function updateTrainingAction(
  _prev: TrainingActionState,
  formData: FormData
): Promise<TrainingActionState> {
  const user = await requireUser();
  const denied = requirePrincipalAction(user);
  if (denied) return { ok: false, error: denied, trainingId: null };

  const idParsed = trainingIdSchema.safeParse({
    trainingId: formData.get("trainingId"),
  });
  if (!idParsed.success) {
    return { ok: false, error: firstIssueMessage(idParsed.error), trainingId: null };
  }

  const parsed = parseTrainingForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error), trainingId: null };
  }

  try {
    await updateTraining(idParsed.data.trainingId, {
      name: parsed.data.name,
      description: parsed.data.description,
      organizer: parsed.data.organizer,
      trainingDate: parsed.data.trainingDate,
      scheduleTime: parsed.data.scheduleTime,
      location: parsed.data.location,
      durationHours: parsed.data.durationHours,
      points: parsed.data.points,
      teacherIds: parsed.data.teacherIds,
    });

    await logAuditEvent({
      action: "update",
      entity: "trainings",
      entityId: idParsed.data.trainingId,
      newData: { name: parsed.data.name, points: parsed.data.points },
    });

    revalidatePath("/growth");
    return { ok: true, error: null, trainingId: idParsed.data.trainingId };
  } catch (error) {
    console.error("updateTrainingAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan perubahan",
      trainingId: null,
    };
  }
}

/**
 * Hapus kegiatan pelatihan (Kepala Sekolah). Peserta ikut
 * terhapus via CASCADE sehingga rekap otomatis menyesuaikan.
 */
export async function deleteTrainingAction(
  _prev: TrainingActionState,
  formData: FormData
): Promise<TrainingActionState> {
  const user = await requireUser();
  const denied = requirePrincipalAction(user);
  if (denied) return { ok: false, error: denied, trainingId: null };

  const parsed = trainingIdSchema.safeParse({
    trainingId: formData.get("trainingId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error), trainingId: null };
  }

  try {
    const { name } = await deleteTraining(parsed.data.trainingId);
    await logAuditEvent({
      action: "delete",
      entity: "trainings",
      entityId: parsed.data.trainingId,
      newData: { name },
    });

    revalidatePath("/growth");
    return { ok: true, error: null, trainingId: parsed.data.trainingId };
  } catch (error) {
    console.error("deleteTrainingAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus pelatihan",
      trainingId: null,
    };
  }
}
