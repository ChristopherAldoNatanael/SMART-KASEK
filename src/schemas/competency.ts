import { z } from "zod";

/**
 * Zod schemas for teacher competency scoring (ronde-13).
 * Saving a score recalculates the teacher's growth snapshot.
 */

export const COMPETENCY_SOURCES = [
  "supervision",
  "self_assessment",
  "coaching",
  "assessment",
  "manual",
  "ai",
] as const;

export const upsertCompetencySchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  competencyId: z.string().uuid("Kompetensi tidak valid"),
  score: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : Number(v)),
    z.number().min(0, "Skor minimal 0").max(100, "Skor maksimal 100")
  ),
  source: z.enum(COMPETENCY_SOURCES).default("manual"),
  notes: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(2000).optional()
  ),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
