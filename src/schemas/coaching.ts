import { z } from "zod";

/**
 * Zod schemas for the Coaching module (Task 11).
 * All server actions in src/app/coaching/actions.ts validate against these.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Empty form strings ("") or missing fields become undefined. */
const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

const optionalDate = () =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z
      .string()
      .regex(DATE_RE, "Tanggal tidak valid (format: YYYY-MM-DD)")
      .optional()
  );

const optionalUuid = () =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().uuid("ID tidak valid").optional()
  );

export const SESSION_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const ACTION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const coachingActionItemSchema = z.object({
  action: z.string().trim().min(3, "Tindakan minimal 3 karakter").max(500),
  targetDate: z
    .string()
    .regex(DATE_RE, "Tanggal target tidak valid")
    .optional(),
});

/** Actions are submitted as a JSON-encoded hidden field. */
const actionsJsonSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.trim() === "") return [];
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  },
  z
    .array(coachingActionItemSchema)
    .max(20, "Maksimal 20 tindak lanjut per sesi")
);

export const createCoachingSessionSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  sessionDate: z.string().regex(DATE_RE, "Tanggal sesi tidak valid"),
  focusArea: optionalText(200),
  initialCondition: optionalText(2000),
  discussion: optionalText(5000),
  agreement: optionalText(5000),
  summary: optionalText(5000),
  status: z.enum(SESSION_STATUSES).default("scheduled"),
  supervisionId: optionalUuid(),
  actionsJson: actionsJsonSchema,
});

export type CreateCoachingSessionInput = z.infer<
  typeof createCoachingSessionSchema
>;

export const addCoachingActionSchema = z.object({
  sessionId: z.string().uuid("Sesi coaching tidak valid"),
  action: z.string().trim().min(3, "Tindakan minimal 3 karakter").max(500),
  targetDate: optionalDate(),
});

export type AddCoachingActionInput = z.infer<typeof addCoachingActionSchema>;

/**
 * Evidence bisa berupa teks, link (Google Drive, dll), atau file upload.
 * Format JSON: { "type": "text"|"link"|"file", "value": string, "fileName"?: string }
 */
const evidenceSchema = z.preprocess(
  (v) => {
    if (v == null || v === "") return undefined;
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return { type: "text", value: v };
      }
    }
    return v;
  },
  z
    .object({
      type: z.enum(["text", "link", "file"]),
      value: z.string().trim().min(1, "Bukti wajib diisi").max(5000),
      fileName: z.string().trim().max(255).optional(),
    })
    .optional()
);

export const updateCoachingActionSchema = z.object({
  actionId: z.string().uuid("Tindak lanjut tidak valid"),
  status: z.enum(ACTION_STATUSES),
  evidence: evidenceSchema,
  result: optionalText(2000),
  notes: optionalText(2000),
});

export type UpdateCoachingActionInput = z.infer<
  typeof updateCoachingActionSchema
>;

export const updateSessionStatusSchema = z.object({
  sessionId: z.string().uuid("Sesi coaching tidak valid"),
  status: z.enum(SESSION_STATUSES),
});

export type UpdateSessionStatusInput = z.infer<
  typeof updateSessionStatusSchema
>;

/** User-safe message from the first validation issue. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
