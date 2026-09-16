import { z } from "zod";

/**
 * Zod schemas for teacher competency scoring (ronde-13).
 * Saving a score recalculates the teacher's growth snapshot.
 *
 * Prinsip provenance (AGENTS.md §3 — database sumber kebenaran):
 * setiap skor wajib punya jejak sumber. Skor dari Supervisi/Coaching/
 * Asesmen/Penilaian Diri hanya dibuat SISTEM dari aktivitas tercatat
 * (lihat jembatan di instrument-assessment.service). Form ini khusus
 * "Penilaian Kepala Sekolah" (tersimpan sebagai 'manual') dan WAJIB
 * menyertakan dasar penilaian agar tidak terkesan dibuat-buat.
 */

export const COMPETENCY_SOURCES = [
  "supervision",
  "self_assessment",
  "coaching",
  "assessment",
  "manual",
  "ai",
] as const;

export const upsertCompetencySchema = z.object({
  teacherId: z.string().uuid("Guru tidak valid"),
  competencyId: z.string().uuid("Kompetensi tidak valid"),
  score: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : Number(v)),
    z.number().min(0, "Skor minimal 0").max(100, "Skor maksimal 100")
  ),
  /** Dikunci: form hanya untuk penilaian langsung Kepala Sekolah. */
  source: z.literal("manual").default("manual"),
  /** Dasar/bukti penilaian — wajib agar skor dapat dipertanggungjawabkan. */
  notes: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z
      .string({ error: "Tulis dasar penilaian" })
      .trim()
      .min(
        10,
        "Tulis dasar penilaian minimal 10 karakter (observasi, tanggal, bukti)"
      )
      .max(2000)
  ),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
