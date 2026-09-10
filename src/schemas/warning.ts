import { z } from "zod";

/**
 * Zod schemas for the Early Warning module (Task 16).
 * Rule findings travel through forms as JSON; severity and evidence
 * are re-validated server-side and never trusted blindly.
 */

export const warningFindingSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  teacherName: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(200).nullable().optional(),
  type: z.enum([
    "low_growth",
    "declining_growth",
    "low_supervision_score",
    "overdue_follow_up",
    "stale_coaching",
    "critical_risk",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  evidence: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
  recommendation: z.string().trim().min(1).max(2000),
});

export type WarningFindingInput = z.infer<typeof warningFindingSchema>;

/** Parse a JSON-encoded finding from FormData. */
export function parseFinding(value: FormDataEntryValue | null): {
  ok: true;
  data: WarningFindingInput;
} | {
  ok: false;
  error: string;
} {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: "Data temuan tidak valid" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, error: "Data temuan tidak valid" };
  }
  const result = warningFindingSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Data temuan tidak valid",
    };
  }
  return { ok: true, data: result.data };
}

export const resolveWarningSchema = z.object({
  warningId: z.string().uuid("Peringatan tidak valid"),
});
