import { z } from "zod";
import { academicYearSchema } from "./students";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createAttendanceSessionSchema = z.object({
  academicYear: academicYearSchema,
  className: z.string().trim().min(1, "Kelas tidak valid").max(50),
  date: z.string().regex(DATE_RE, "Tanggal tidak valid"),
  label: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "Absensi Pagi")),
  /** Batas tepat waktu HH:mm (opsional). Lewat batas = Terlambat. */
  lateAfter: z
    .string()
    .trim()
    .regex(TIME_RE, "Batas harus HH:mm")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /** Batas akhir sesi HH:mm (opsional). */
  endsAt: z
    .string()
    .trim()
    .regex(TIME_RE, "Berakhir harus HH:mm")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateAttendanceSessionInput = z.infer<
  typeof createAttendanceSessionSchema
>;

/** Identitas ringan siswa di halaman publik: nama + NIS/nomor induk. */
export const qrIdentitySchema = z.object({
  token: z.string().trim().min(16).max(128),
  fullName: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  studentCode: z.string().trim().min(2, "NIS/nomor induk minimal 2 karakter").max(50),
});

export type QrIdentityInput = z.infer<typeof qrIdentitySchema>;

export const qrConfirmSchema = z.object({
  token: z.string().trim().min(16).max(128),
  studentId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Data siswa tidak valid"
    ),
  studentCode: z.string().trim().min(2).max(50),
});

export type QrConfirmInput = z.infer<typeof qrConfirmSchema>;

export function firstSessionIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
