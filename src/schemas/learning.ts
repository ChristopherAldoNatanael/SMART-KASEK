import { z } from "zod";

/**
 * Zod schemas for Pembelajaran — Modul Ajar (ronde-9).
 * Guru menginput, Kepala Sekolah melihat data yang sama (satu tabel).
 */

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(max).optional()
  );

export const LESSON_STATUSES = ["draft", "published", "archived"] as const;

export const createLessonPlanSchema = z.object({
  /** Wajib diisi principal; guru otomatis memakai datanya sendiri. */
  teacherId: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().uuid("Guru tidak valid").optional()
  ),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(200),
  subject: optionalText(100),
  className: optionalText(50),
  semester: optionalText(20),
  description: optionalText(5000),
  fileUrl: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().max(500).optional()
  ),
  docUrl: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z
      .string()
      .trim()
      .max(500)
      .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
        message: "Tautan harus diawali http:// atau https://",
      })
      .optional()
  ),
  status: z.enum(LESSON_STATUSES).default("draft"),
});

export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;

const clearableText = (max: number) =>
  z.preprocess(
    (v) => {
      if (v == null) return undefined;
      if (typeof v !== "string" || v.trim() === "") return null;
      return v.trim();
    },
    z.string().trim().max(max).nullable().optional()
  );

/** Edit: string kosong = kosongkan; tak dikirim = pertahankan. */
export const updateLessonPlanSchema = z.object({
  lessonId: z.string().uuid("Modul ajar tidak valid"),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(200),
  subject: clearableText(100),
  className: clearableText(50),
  semester: clearableText(20),
  description: clearableText(5000),
  fileUrl: clearableText(500),
  docUrl: z.preprocess(
    (v) => {
      if (v == null) return undefined;
      if (typeof v !== "string" || v.trim() === "") return null;
      return v.trim();
    },
    z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .refine(
        (v) =>
          v == null ||
          v.startsWith("http://") ||
          v.startsWith("https://"),
        { message: "Tautan harus diawali http:// atau https://" }
      )
  ),
  status: z.enum(LESSON_STATUSES),
});

export const deleteLessonPlanSchema = z.object({
  lessonId: z.string().uuid("Modul ajar tidak valid"),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
