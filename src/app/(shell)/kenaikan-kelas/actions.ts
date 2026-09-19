"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logAuditEvent } from "@/services/audit.service";
import {
  applyPromotionDecisions,
  decidePromotion,
  reopenDecision,
  returnToHomeroom,
  saveRecommendation,
  submitClassRecommendations,
} from "@/services/promotion.service";
import {
  applyPromotionSchema,
  firstPromotionIssueMessage,
  promotionDecideSchema,
  promotionRecommendationSchema,
  promotionReopenSchema,
  promotionReturnSchema,
  promotionSubmitSchema,
} from "@/schemas/promotion";

export type PromotionActionState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

function fail(error: string): PromotionActionState {
  return { ok: false, error, message: null };
}

function succeed(message: string | null = null): PromotionActionState {
  return { ok: true, error: null, message };
}

function revalidatePromotion(id?: string) {
  revalidatePath("/kenaikan-kelas");
  if (id) revalidatePath(`/kenaikan-kelas/siswa/${id}`);
}

/** Simpan draft rekomendasi wali kelas. */
export async function saveRecommendationAction(
  _prev: PromotionActionState,
  formData: FormData
): Promise<PromotionActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");

  const parsed = promotionRecommendationSchema.safeParse({
    studentId: formData.get("studentId"),
    academicYear: formData.get("academicYear"),
    recommendation: formData.get("recommendation"),
    note: formData.get("note"),
  });
  if (!parsed.success) return fail(firstPromotionIssueMessage(parsed.error));

  try {
    const row = await saveRecommendation({
      studentId: parsed.data.studentId,
      academicYear: parsed.data.academicYear,
      recommendation: parsed.data.recommendation,
      note: parsed.data.note,
    });
    await logAuditEvent({
      action: "update",
      entity: "promotion_decisions",
      entityId: row.id,
      newData: {
        student_id: row.student_id,
        recommendation: row.recommendation,
        status: "draft",
      },
    });
    revalidatePromotion(parsed.data.studentId);
    return succeed("Rekomendasi tersimpan sebagai draft.");
  } catch (error) {
    console.error("saveRecommendationAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan rekomendasi");
  }
}

/** Kirim rekomendasi kelas ke Kepala Sekolah. */
export async function submitClassAction(
  _prev: PromotionActionState,
  formData: FormData
): Promise<PromotionActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");

  const parsed = promotionSubmitSchema.safeParse({
    academicYear: formData.get("academicYear"),
    className: formData.get("className"),
  });
  if (!parsed.success) return fail(firstPromotionIssueMessage(parsed.error));

  try {
    const { sent } = await submitClassRecommendations(
      parsed.data.academicYear,
      parsed.data.className
    );
    await logAuditEvent({
      action: "submit",
      entity: "promotion_decisions",
      newData: {
        academic_year: parsed.data.academicYear,
        class_name: parsed.data.className,
        sent,
      },
    });
    revalidatePromotion();
    return succeed(`${sent} rekomendasi dikirim ke Kepala Sekolah.`);
  } catch (error) {
    console.error("submitClassAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengirim rekomendasi");
  }
}

/** Tetapkan keputusan final (Kepala Sekolah). */
export async function decidePromotionAction(
  _prev: PromotionActionState,
  formData: FormData
): Promise<PromotionActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");

  const parsed = promotionDecideSchema.safeParse({
    decisionId: formData.get("decisionId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) return fail(firstPromotionIssueMessage(parsed.error));

  try {
    const row = await decidePromotion({
      decisionId: parsed.data.decisionId,
      decision: parsed.data.decision,
      note: parsed.data.note,
    });
    await logAuditEvent({
      action: "decide",
      entity: "promotion_decisions",
      entityId: row.id,
      newData: {
        student_id: row.student_id,
        final_decision: row.final_decision,
        status: "decided",
      },
    });
    revalidatePromotion(row.student_id);
    return succeed(
      `Keputusan ditetapkan: ${row.final_decision === "naik" ? "Naik Kelas" : "Tidak Naik Kelas"}.`
    );
  } catch (error) {
    console.error("decidePromotionAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menetapkan keputusan");
  }
}

/** Kembalikan ke wali kelas (wajib alasan). */
export async function returnPromotionAction(
  _prev: PromotionActionState,
  formData: FormData
): Promise<PromotionActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");

  const parsed = promotionReturnSchema.safeParse({
    decisionId: formData.get("decisionId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return fail(firstPromotionIssueMessage(parsed.error));

  try {
    const row = await returnToHomeroom({
      decisionId: parsed.data.decisionId,
      note: parsed.data.note,
    });
    await logAuditEvent({
      action: "return",
      entity: "promotion_decisions",
      entityId: row.id,
      newData: { student_id: row.student_id, status: "returned" },
    });
    revalidatePromotion(row.student_id);
    return succeed("Dikembalikan ke wali kelas beserta catatan.");
  } catch (error) {
    console.error("returnPromotionAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengembalikan");
  }
}

/**
 * Terapkan keputusan ke tahun ajaran baru (Kepala Sekolah).
 * Hanya siswa berkeputusan final Naik yang dipindahkan.
 */
export async function applyPromotionDecisionsAction(
  _prev: PromotionActionState,
  formData: FormData
): Promise<PromotionActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");

  const parsed = applyPromotionSchema.safeParse({
    sourceYear: formData.get("sourceYear"),
    targetYear: formData.get("targetYear"),
    mappingsJson: formData.get("mappingsJson"),
  });
  if (!parsed.success) return fail(firstPromotionIssueMessage(parsed.error));

  try {
    const outcome = await applyPromotionDecisions({
      sourceYear: parsed.data.sourceYear,
      targetYear: parsed.data.targetYear,
      mappings: parsed.data.mappingsJson.map((m) => ({
        fromClass: m.fromClass,
        toClass: m.toClass,
        graduate: m.graduate,
      })),
    });
    await logAuditEvent({
      action: "apply",
      entity: "promotion_decisions",
      newData: {
        source_year: parsed.data.sourceYear,
        target_year: parsed.data.targetYear,
        moved: outcome.moved,
        graduated: outcome.graduated,
        skipped: outcome.skipped,
      },
    });
    revalidatePromotion();
    const parts = [];
    if (outcome.moved > 0)
      parts.push(`${outcome.moved} siswa pindah ke tahun ${parsed.data.targetYear}`);
    if (outcome.graduated > 0) parts.push(`${outcome.graduated} siswa lulus`);
    if (outcome.skipped > 0) parts.push(`${outcome.skipped} dilewati (sudah ada)`);
    return succeed(parts.length > 0 ? `${parts.join(". ")}.` : "Tidak ada yang dipindahkan.");
  } catch (error) {
    console.error("applyPromotionDecisionsAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menerapkan keputusan");
  }
}

/** Buka kembali keputusan final (wajib alasan, tercatat di audit). */
export async function reopenPromotionAction(
  _prev: PromotionActionState,
  formData: FormData
): Promise<PromotionActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");

  const parsed = promotionReopenSchema.safeParse({
    decisionId: formData.get("decisionId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return fail(firstPromotionIssueMessage(parsed.error));

  try {
    const row = await reopenDecision({
      decisionId: parsed.data.decisionId,
      note: parsed.data.note,
    });
    await logAuditEvent({
      action: "reopen",
      entity: "promotion_decisions",
      entityId: row.id,
      newData: { student_id: row.student_id, status: "returned" },
    });
    revalidatePromotion(row.student_id);
    return succeed("Keputusan dibuka kembali dan dikembalikan ke wali kelas.");
  } catch (error) {
    console.error("reopenPromotionAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal membuka kembali");
  }
}
