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

export const updateProfileSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter").max(200),
  employeeNumber: clearableText(50),
  department: clearableText(100),
  educationLevel: clearableText(50),
  employmentStatus: clearableText(30),
  joinedAt: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
      .optional()
  ),
});

export const toggleActiveSchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  active: z.preprocess(
    (v) => v === "true" || v === true,
    z.boolean()
  ),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
