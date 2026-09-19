"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AIError } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateCoachingDraft,
  getSupervisionInsight,
  saveCoachingDraft,
  type CoachingDraft,
  type SupervisionInsight,
} from "@/services/ai.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  aiSaveDraftSchema,
  aiSupervisionSchema,
  firstAIIssueMessage,
} from "@/schemas/ai";

export type AIActionState<T> = {
  ok: boolean;
  error: string | null;
  data: T | null;
  cached?: boolean;
};

function fail<T>(error: string): AIActionState<T> {
  return { ok: false, error, data: null };
}

function aiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AIError) return error.message;
  return error instanceof Error ? fallback : fallback;
}

/** Analisis / analisis ulang satu supervisi (generate: Kepala Sekolah). */
export async function analyzeSupervisionAction(
  _prev: AIActionState<SupervisionInsight>,
  formData: FormData
): Promise<AIActionState<SupervisionInsight>> {
  const user = await requireUser();
  if (!user.schoolId) {
    return fail("Akun Anda belum terhubung ke sekolah.");
  }

  const aiLimit = checkRateLimit(`ai-analyze:${user.id}`, 15, 600_000);
  if (!aiLimit.ok) {
    return fail(
      `Terlalu banyak permintaan AI. Coba lagi dalam ${aiLimit.retryAfterSec} detik.`
    );
  }

  const parsed = aiSupervisionSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    refresh: formData.get("refresh"),
  });
  if (!parsed.success) return fail(firstAIIssueMessage(parsed.error));

  try {
    const result = await getSupervisionInsight(
      parsed.data.supervisionId,
      parsed.data.refresh ?? false
    );
    await logAuditEvent({
      action: parsed.data.refresh ? "ai_refresh" : "ai_analyze",
      entity: "ai_insights",
      newData: {
        supervision_id: parsed.data.supervisionId,
        cached: result.cached,
      },
    });
    revalidatePath(`/supervision/manajerial/${parsed.data.supervisionId}`);
    revalidatePath(`/supervision/${parsed.data.supervisionId}`);
    return { ok: true, error: null, data: result.insight, cached: result.cached };
  } catch (error) {
    console.error("analyzeSupervisionAction error:", error);
    return fail(aiErrorMessage(error, "AI sedang tidak dapat digunakan. Silakan coba lagi."));
  }
}

/** Buat draf rencana coaching dari temuan supervisi (tidak menyimpan). */
export async function generateCoachDraftAction(
  _prev: AIActionState<CoachingDraft>,
  formData: FormData
): Promise<AIActionState<CoachingDraft>> {
  const user = await requireUser();
  if (!user.schoolId) {
    return fail("Akun Anda belum terhubung ke sekolah.");
  }

  const draftLimit = checkRateLimit(`ai-draft:${user.id}`, 15, 600_000);
  if (!draftLimit.ok) {
    return fail(
      `Terlalu banyak permintaan AI. Coba lagi dalam ${draftLimit.retryAfterSec} detik.`
    );
  }

  const parsed = aiSupervisionSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
  });
  if (!parsed.success) return fail(firstAIIssueMessage(parsed.error));

  try {
    const draft = await generateCoachingDraft(parsed.data.supervisionId);
    await logAuditEvent({
      action: "ai_draft",
      entity: "ai_insights",
      newData: { supervision_id: parsed.data.supervisionId },
    });
    return { ok: true, error: null, data: draft };
  } catch (error) {
    console.error("generateCoachDraftAction error:", error);
    return fail(aiErrorMessage(error, "AI sedang tidak dapat digunakan. Silakan coba lagi."));
  }
}

export type SaveDraftState = {
  ok: boolean;
  error: string | null;
  sessionId: string | null;
};

/** Simpan draf yang SUDAH direview ke Coaching, lalu buka hasilnya. */
export async function saveCoachDraftAction(
  _prev: SaveDraftState,
  formData: FormData
): Promise<SaveDraftState> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { ok: false, error: "Akun Anda belum terhubung ke sekolah.", sessionId: null };
  }

  const parsed = aiSaveDraftSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    teacherId: formData.get("teacherId"),
    sessionDate: formData.get("sessionDate"),
    focus: formData.get("focus"),
    objective: formData.get("objective"),
    stepsText: formData.get("stepsText"),
    followUpTarget: formData.get("followUpTarget"),
    reflectionText: formData.get("reflectionText"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstAIIssueMessage(parsed.error), sessionId: null };
  }

  let sessionId: string;
  try {
    ({ sessionId } = await saveCoachingDraft({
      supervisionId: parsed.data.supervisionId,
      teacherId: parsed.data.teacherId,
      sessionDate: parsed.data.sessionDate,
      focus: parsed.data.focus,
      objective: parsed.data.objective,
      steps: parsed.data.stepsText,
      followUpTarget: parsed.data.followUpTarget ?? "",
      reflectionQuestions: parsed.data.reflectionText,
    }));
    await logAuditEvent({
      action: "create",
      entity: "coaching_sessions",
      entityId: sessionId,
      newData: {
        supervision_id: parsed.data.supervisionId,
        from_ai_draft: true,
      },
    });
  } catch (error) {
    console.error("saveCoachDraftAction error:", error);
    return {
      ok: false,
      error: aiErrorMessage(error, "Gagal menyimpan ke Coaching."),
      sessionId: null,
    };
  }

  revalidatePath("/coaching");
  redirect(`/coaching/${sessionId}`);
}
