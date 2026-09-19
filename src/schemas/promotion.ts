import { z } from "zod";
import { academicYearSchema } from "./students";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionalNote = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

export const promotionRecommendationSchema = z.object({
  studentId: z.string().regex(UUID_RE, "Siswa tidak valid"),
  academicYear: academicYearSchema,
  recommendation: z.enum(["naik", "tidak_naik", "pertimbangan"], {
    message: "Pilih rekomendasi dulu",
  }),
  // Wajib untuk Tidak Naik / Perlu Pertimbangan (aturan main fitur,
  // bukan threshold akademik) — dicek di service agar pesan jelas.
  note: optionalNote(2000),
});

export const promotionSubmitSchema = z.object({
  academicYear: academicYearSchema,
  className: z.string().trim().min(1, "Kelas tidak valid").max(50),
});

export const promotionDecideSchema = z.object({
  decisionId: z.string().regex(UUID_RE, "Data tidak valid"),
  decision: z.enum(["naik", "tidak_naik"], { message: "Pilih keputusan dulu" }),
  note: optionalNote(2000),
});

export const promotionReturnSchema = z.object({
  decisionId: z.string().regex(UUID_RE, "Data tidak valid"),
  note: z
    .string()
    .trim()
    .min(1, "Tulis alasan pengembalian dulu")
    .max(2000),
});

export const promotionReopenSchema = z.object({
  decisionId: z.string().regex(UUID_RE, "Data tidak valid"),
  note: z
    .string()
    .trim()
    .min(1, "Tulis alasan pembukaan kembali dulu")
    .max(2000),
});

export function firstPromotionIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}

const applyMappingSchema = z.object({
  fromClass: z.string().trim().max(50),
  toClass: z.string().trim().max(50),
  graduate: z.boolean(),
});

/** Peta penerapan dikirim sebagai JSON (maksimal 100 kelas). */
export const applyPromotionSchema = z.object({
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
    z.array(applyMappingSchema).min(1, "Peta kelas belum diisi").max(100)
  ),
});
