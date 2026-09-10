"use server";

import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  explainFinding,
  resolveWarning,
  saveFindingAsWarning,
} from "@/services/warning.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  parseFinding,
  resolveWarningSchema,
} from "@/schemas/warning";
import type { ValidatedAIOutput } from "@/lib/ai/validators";

export type WarningActionState = {
  ok: boolean;
  error: string | null;
  data?: ValidatedAIOutput | null;
};

async function requireWarningMutation(): Promise<
  { user: CurrentUser; error: null } | { user: null; error: string }
> {
  const user = await requireUser();
  if (!user.schoolId) {
    return { user: null, error: "Akun Anda belum terhubung ke sekolah" };
  }
  if (!hasRole(user.role, "principal")) {
    return {
      user: null,
      error: "Hanya Kepala Sekolah yang dapat memproses peringatan",
    };
  }
  return { user, error: null };
}

function revalidateWarningPages() {
  revalidatePath("/ai/early-warning");
  revalidatePath("/dashboard");
}

/**
 * AI explains one rule finding. Severity stays as the rules decided.
 */
export async function explainWarningAction(
  _prev: WarningActionState,
  formData: FormData
): Promise<WarningActionState> {
  const gate = await requireWarningMutation();
  if (!gate.user) return { ok: false, error: gate.error, data: null };

  const parsed = parseFinding(formData.get("findingJson"));
  if (!parsed.ok) return { ok: false, error: parsed.error, data: null };

  const finding = { ...parsed.data, subject: parsed.data.subject ?? null };
  const result = await explainFinding(finding);
  if (!result.success || !result.data) {
    return {
      ok: false,
      error: result.error ?? "Gagal meminta penjelasan AI",
      data: null,
    };
  }
  return { ok: true, error: null, data: result.data };
}

/**
 * Persist a rule finding as a stored warning (deduplicated).
 */
export async function saveWarningAction(
  _prev: WarningActionState,
  formData: FormData
): Promise<WarningActionState> {
  const gate = await requireWarningMutation();
  if (!gate.user) return { ok: false, error: gate.error, data: null };

  const parsed = parseFinding(formData.get("findingJson"));
  if (!parsed.ok) return { ok: false, error: parsed.error, data: null };

  try {
    const saved = await saveFindingAsWarning({
      ...parsed.data,
      subject: parsed.data.subject ?? null,
    });
    await logAuditEvent({
      action: "create",
      entity: "early_warnings",
      entityId: saved.id,
      newData: { teacher_id: parsed.data.teacherId, type: parsed.data.type },
    });
  } catch (error) {
    console.error("saveWarningAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan peringatan",
      data: null,
    };
  }

  revalidateWarningPages();
  return { ok: true, error: null, data: null };
}

/**
 * Mark a stored warning as resolved.
 */
export async function resolveWarningAction(
  _prev: WarningActionState,
  formData: FormData
): Promise<WarningActionState> {
  const gate = await requireWarningMutation();
  if (!gate.user) return { ok: false, error: gate.error, data: null };

  const parsed = resolveWarningSchema.safeParse({
    warningId: formData.get("warningId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
      data: null,
    };
  }

  try {
    await resolveWarning(parsed.data.warningId);
    await logAuditEvent({
      action: "update",
      entity: "early_warnings",
      entityId: parsed.data.warningId,
      newData: { status: "resolved" },
    });
  } catch (error) {
    console.error("resolveWarningAction error:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal menyelesaikan peringatan",
      data: null,
    };
  }

  revalidateWarningPages();
  return { ok: true, error: null, data: null };
}
