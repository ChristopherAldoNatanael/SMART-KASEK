import { z } from "zod";
import { academicYearSchema } from "./students";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Normalisasi jam gaya Indonesia: "07.15" / "07:15" / "7:15" / "0715"
 * → "07:15" (24 jam). Kosong → undefined (opsional).
 */
function normalizeClockInput(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  let s = v.trim().replace(/\s+/g, "");
  if (s === "") return undefined;
  s = s.replace(".", ":");
  if (/^\d{3,4}$/.test(s)) {
    s = s.padStart(4, "0");
    return `${s.slice(0, 2)}:${s.slice(2)}`;
  }
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return s;
}

const clockSchema = z.preprocess(
  normalizeClockInput,
  z
    .string()
    .regex(TIME_RE, "Jam harus format 24 jam, cth. 07:15 atau 07.15")
    .optional()
);

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
  /** Batas tepat waktu 24 jam (opsional). Lewat batas = Terlambat. */
  lateAfter: clockSchema,
  /** Batas akhir sesi 24 jam (opsional). */
  endsAt: clockSchema,
});

export type CreateAttendanceSessionInput = z.infer<
  typeof createAttendanceSessionSchema
>;

/**
 * Identitas siswa = pilihan dari daftar (tanpa ketik NIS).
 * Pilihan klien tidak dipercaya — server memvalidasi ulang
 * bahwa studentId memang anggota kelas sesi ini.
 */
const qrStudentRefSchema = z.object({
  token: z.string().trim().min(16).max(128),
  studentId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Data siswa tidak valid"
    ),
});

export const qrPreviewSchema = qrStudentRefSchema;
export type QrPreviewInput = z.infer<typeof qrPreviewSchema>;

export const qrConfirmSchema = qrStudentRefSchema;
export type QrConfirmInput = z.infer<typeof qrConfirmSchema>;

export function firstSessionIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
