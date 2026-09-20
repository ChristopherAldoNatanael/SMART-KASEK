import { z } from "zod";
import { academicYearSchema } from "./students";
import { PROGRAM_STATUSES } from "@/lib/programs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

const optionalDate = z.preprocess(
  (v) =>
    v == null || (typeof v === "string" && v.trim() === "") ? undefined : v,
  z.string().trim().regex(DATE_RE, "Tanggal harus YYYY-MM-DD").optional()
);

const optionalBudget = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = typeof v === "string" ? Number(v.replace(/[^\d-]/g, "")) : v;
    return n;
  },
  z.number().int().min(0, "Anggaran tidak boleh negatif").max(999_999_999_999).optional()
);

const semesterSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
  z.number().int().min(1).max(2)
);

/** Tambah program baru — selalu mulai sebagai Direncanakan. */
export const createProgramSchema = z
  .object({
    name: z.string().trim().min(3, "Nama program minimal 3 huruf").max(120),
    category: optionalText(60),
    description: optionalText(2000),
    startDate: optionalDate,
    endDate: optionalDate,
    budget: optionalBudget,
    semester: semesterSchema,
    academicYear: academicYearSchema,
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    { message: "Tanggal selesai harus setelah tanggal mulai", path: ["endDate"] }
  );

export type CreateProgramInput = z.infer<typeof createProgramSchema>;

/** Ubah detail program (nama, kategori, deskripsi, tanggal, anggaran, semester). */
export const updateProgramSchema = z
  .object({
    programId: z.string().regex(UUID_RE, "Program tidak valid"),
    name: z.string().trim().min(3, "Nama program minimal 3 huruf").max(120),
    category: optionalText(60),
    description: optionalText(2000),
    startDate: optionalDate,
    endDate: optionalDate,
    budget: optionalBudget,
    semester: semesterSchema,
    academicYear: academicYearSchema,
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    { message: "Tanggal selesai harus setelah tanggal mulai", path: ["endDate"] }
  );

export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

/** Pindah status lifecycle program. */
export const programStatusSchema = z.object({
  programId: z.string().regex(UUID_RE, "Program tidak valid"),
  status: z.enum(PROGRAM_STATUSES),
});

export function firstProgramIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
