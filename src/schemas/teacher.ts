import { z } from "zod";

/**
 * Zod schemas for teacher teaching assignment (ronde-14).
 * Empty string means CLEAR the value (nonaktifkan); missing field
 * means keep existing. This differs from other modules where empty
 * means "keep" — here explicit clearing is the feature.
 */

const clearableText = (max: number) =>
  z.preprocess(
    (v) => {
      if (v == null) return undefined;
      if (typeof v !== "string" || v.trim() === "") return null;
      return v.trim();
    },
    z.string().trim().max(max).nullable().optional()
  );

export const updateTeachingSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  subject: clearableText(100),
  homeroomClass: clearableText(50),
  nip: clearableText(50),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
