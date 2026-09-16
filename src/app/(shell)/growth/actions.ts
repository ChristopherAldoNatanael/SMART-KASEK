"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { recalculateAllGrowth } from "@/services/growth.service";
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
