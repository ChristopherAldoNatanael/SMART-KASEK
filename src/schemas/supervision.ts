import { z } from "zod";

/**
 * Zod schemas for the Supervision module (Task 10 follow-up).
 * Score scale: 0–100 (matches growth charts and seed data).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

export const SUPERVISION_STATUSES = [
  "draft",
  "completed",
  "follow_up",
  "closed",
] as const;

const supervisionItemSchema = z.object({
  indicator: z.string().trim().min(3, "Indikator minimal 3 karakter").max(500),
  category: z.string().trim().max(100).optional(),
  score: z.number().min(0, "Skor minimal 0").max(100, "Skor maksimal 100").optional(),
  observation: z.string().trim().max(2000).optional(),
  recommendation: z.string().trim().max(2000).optional(),
});

/** Items are submitted as a JSON-encoded hidden field. */
const itemsJsonSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.trim() === "") return [];
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  },
  z
    .array(supervisionItemSchema)
    .max(30, "Maksimal 30 indikator per supervisi")
);

export const createSupervisionSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  supervisionDate: z.string().regex(DATE_RE, "Tanggal supervisi tidak valid"),
  type: optionalText(100),
  summary: optionalText(5000),
  strengths: optionalText(5000),
  improvements: optionalText(5000),
  status: z.enum(SUPERVISION_STATUSES).default("draft"),
  itemsJson: itemsJsonSchema,
});

export type CreateSupervisionInput = z.infer<typeof createSupervisionSchema>;

export const updateSupervisionStatusSchema = z.object({
  supervisionId: z.string().uuid("Supervisi tidak valid"),
  status: z.enum(SUPERVISION_STATUSES),
});

export type UpdateSupervisionStatusInput = z.infer<
  typeof updateSupervisionStatusSchema
>;

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
