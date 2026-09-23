"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { regenerateInviteCode } from "@/services/school.service";
import { logAuditEvent } from "@/services/audit.service";

export type InviteActionState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

/**
 * Ganti kode undangan sekolah (principal/admin).
 * Kode lama langsung tidak berlaku; guru yang sudah bergabung tidak
 * terpengaruh. Dibatasi 5x/jam per user agar tidak di-spam.
 */
export async function regenerateInviteCodeAction(): Promise<InviteActionState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { ok: false, error: "Akun Anda belum terhubung ke sekolah.", message: null };
  }
  if (user.role !== "principal" && user.role !== "admin") {
    return { ok: false, error: "Hanya Kepala Sekolah yang dapat mengganti kode undangan.", message: null };
  }
  const rl = checkRateLimit(`invite-regen:${user.id}`, 5, 3_600_000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Terlalu sering mengganti kode. Coba lagi dalam ${Math.ceil(rl.retryAfterSec / 60)} menit.`,
      message: null,
    };
  }
  try {
    const code = await regenerateInviteCode();
    await logAuditEvent({
      action: "regenerate",
      entity: "schools",
      entityId: user.schoolId,
      newData: { invite_code: code },
    });
    revalidatePath("/dashboard");
    return { ok: true, error: null, message: `Kode baru ${code} sudah aktif. Kode lama tidak berlaku lagi.` };
  } catch (error) {
    console.error("regenerateInviteCodeAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal membuat kode baru",
      message: null,
    };
  }
}
