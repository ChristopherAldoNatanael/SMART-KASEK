import { z } from "zod";

/**
 * Zod schemas for the Supervision module.
 * Penilaian memakai instrumen 12 aspek (lihat instrument-assessment);
 * skema di sini hanya untuk penjadwalan dan status.
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

export const scheduleSupervisionSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  supervisionDate: z.string().regex(DATE_RE, "Tanggal supervisi tidak valid"),
  type: optionalText(100),
});

export type ScheduleSupervisionInput = z.infer<typeof scheduleSupervisionSchema>;

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
