import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const schoolClassNameSchema = z
  .string()
  .trim()
  .min(1, "Nama kelas tidak boleh kosong")
  .max(50);

export const createSchoolClassSchema = z.object({
  name: schoolClassNameSchema,
});

export const renameSchoolClassSchema = z.object({
  classId: z.string().regex(UUID_RE, "Kelas tidak valid"),
  name: schoolClassNameSchema,
});

export const schoolClassIdSchema = z.object({
  classId: z.string().regex(UUID_RE, "Kelas tidak valid"),
});

export const setSchoolClassActiveSchema = z.object({
  classId: z.string().regex(UUID_RE, "Kelas tidak valid"),
  isActive: z.preprocess((v) => v === "true", z.boolean()),
});

export function firstClassIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
