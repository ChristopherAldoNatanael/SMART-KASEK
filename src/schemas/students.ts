import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

/** "2026 / 2027" dinormalisasi menjadi "2026/2027". */
export const academicYearSchema = z
  .string()
  .trim()
  .regex(/^\d{4}\s*\/\s*\d{4}$/, "Tahun ajaran harus seperti 2026/2027")
  .transform((v) => v.replace(/\s+/g, ""));

export const studentFormSchema = z.object({
  fullName: z.string().trim().min(1, "Nama wajib diisi").max(100),
  studentNumber: optionalText(50),
  className: optionalText(50),
  gender: z.enum(["male", "female"]).optional(),
  status: z.enum(["active", "graduated", "transferred", "dropped"]),
  academicYear: academicYearSchema,
});

export type StudentFormInput = z.infer<typeof studentFormSchema>;

export const studentIdSchema = z
  .string()
  .regex(UUID_RE, "Data siswa tidak valid");

const importRowSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  student_number: z.string().trim().max(50).nullable(),
  class_name: z.string().trim().max(50).nullable(),
  gender: z.enum(["male", "female"]).nullable(),
  status: z.enum(["active", "graduated", "transferred", "dropped"]),
});

/** Baris import dikirim sebagai JSON (maksimal 1000 baris sekali import). */
export const studentImportSchema = z.object({
  academicYear: academicYearSchema,
  rowsJson: z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    z.array(importRowSchema).min(1, "Tidak ada baris data").max(1000)
  ),
});

export function firstStudentIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const attendanceItemSchema = z.object({
  studentId: z.string().regex(UUID_RE, "Data siswa tidak valid"),
  status: z.enum(["hadir", "izin", "sakit", "alpa"]),
});

/** Absensi satu kelas satu tanggal dikirim sebagai JSON (maksimal 500). */
export const saveAttendanceSchema = z.object({
  academicYear: academicYearSchema,
  className: z.string().trim().min(1, "Kelas tidak valid").max(50),
  date: z.string().regex(DATE_RE, "Tanggal tidak valid"),
  itemsJson: z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    z.array(attendanceItemSchema).min(1, "Belum ada yang ditandai").max(500)
  ),
});

export const assignHomeroomSchema = z.object({
  teacherId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().regex(UUID_RE, "Guru tidak valid").optional()
  ),
  className: z.string().trim().min(1, "Kelas tidak valid").max(50),
});

const assignmentItemSchema = z.object({
  className: z.string().trim().max(50),
  subject: z.string().trim().max(100),
});

/** Daftar kelas yang diajar dikirim sebagai JSON (maksimal 30). */
export const saveMyAssignmentsSchema = z.object({
  academicYear: academicYearSchema,
  itemsJson: z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    z.array(assignmentItemSchema).max(30)
  ),
});

const promoteMappingSchema = z.object({
  /** Nama kelas asal ("" = tanpa kelas). */
  fromClass: z.string().trim().max(50),
  /** Nama kelas tujuan (boleh "" bila diluluskan). */
  toClass: z.string().trim().max(50),
  graduate: z.boolean(),
});

/** Peta kenaikan dikirim sebagai JSON (maksimal 100 kelas). */
export const studentPromoteSchema = z.object({
  sourceYear: academicYearSchema,
  targetYear: academicYearSchema,
  mappingsJson: z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    z.array(promoteMappingSchema).min(1, "Pilih minimal 1 kelas").max(100)
  ),
});
