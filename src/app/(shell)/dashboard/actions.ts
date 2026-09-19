"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AIError } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSchoolInsight, type SchoolInsight } from "@/services/ai.service";
import { logAuditEvent } from "@/services/audit.service";
import type { AIActionState } from "@/app/(shell)/supervision/ai-actions";

function fail(error: string): AIActionState<SchoolInsight> {
  return { ok: false, error, data: null };
}

/** Analisis kondisi sekolah dari statistik agregat (Kepala Sekolah). */
export async function analyzeSchoolAction(
  _prev: AIActionState<SchoolInsight>,
  formData: FormData
): Promise<AIActionState<SchoolInsight>> {
  const user = await requireUser();
  if (!user.schoolId) {
    return fail("Akun Anda belum terhubung ke sekolah.");
  }
  const refresh = formData.get("refresh") === "true";

  const aiLimit = checkRateLimit(`ai-school:${user.id}`, 15, 600_000);
  if (!aiLimit.ok) {
    return fail(
      `Terlalu banyak permintaan AI. Coba lagi dalam ${aiLimit.retryAfterSec} detik.`
    );
  }

  try {
    const result = await getSchoolInsight(refresh);
    await logAuditEvent({
      action: refresh ? "ai_refresh" : "ai_analyze",
      entity: "ai_insights",
      newData: { scope: "school", cached: result.cached },
    });
    revalidatePath("/dashboard");
    return {
      ok: true,
      error: null,
      data: result.insight,
      cached: result.cached,
    };
  } catch (error) {
    console.error("analyzeSchoolAction error:", error);
    if (error instanceof AIError) return fail(error.message);
    return fail("AI sedang tidak dapat digunakan. Silakan coba lagi.");
  }
}
