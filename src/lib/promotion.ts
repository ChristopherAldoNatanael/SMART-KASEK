/**
 * Workflow Kenaikan Kelas (murni, tanpa threshold otomatis).
 *
 * Status (konvensi snake_case project):
 *   draft     = wali menyusun rekomendasi
 *   submitted = menunggu verifikasi Kepala Sekolah
 *   returned  = dikembalikan ke wali (wajib ada catatan)
 *   decided   = sudah ditetapkan (final, terkunci)
 *
 * Keputusan final hanya: naik | tidak_naik (oleh Kepala Sekolah).
 * Rekomendasi wali: naik | tidak_naik | pertimbangan.
 */

export type PromotionStatus = "draft" | "submitted" | "returned" | "decided";

export type PromotionRecommendation = "naik" | "tidak_naik" | "pertimbangan";

export type PromotionDecision = "naik" | "tidak_naik";

export const PROMOTION_STATUSES: PromotionStatus[] = [
  "draft",
  "submitted",
  "returned",
  "decided",
];

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: "Draft",
  submitted: "Menunggu Verifikasi",
  returned: "Dikembalikan",
  decided: "Ditetapkan",
};

export const PROMOTION_RECOMMENDATION_LABELS: Record<PromotionRecommendation, string> = {
  naik: "Naik Kelas",
  tidak_naik: "Tidak Naik Kelas",
  pertimbangan: "Perlu Pertimbangan",
};

export const PROMOTION_DECISION_LABELS: Record<PromotionDecision, string> = {
  naik: "Naik Kelas",
  tidak_naik: "Tidak Naik Kelas",
};

/**
 * Rentang tanggal absensi untuk 1 tahun ajaran ("2026/2027" →
 * 2026-07-01 s.d. 2027-06-30). Null bila format tak dikenal.
 */
export function academicYearDateRange(
  academicYear: string
): { from: string; to: string } | null {
  const m = academicYear.trim().match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  return { from: `${m[1]}-07-01`, to: `${m[2]}-06-30` };
}

/** Label status aman untuk nilai dari database. */
export function promotionStatusLabel(status: string): string {
  if (status === "draft") return PROMOTION_STATUS_LABELS.draft;
  if (status === "submitted") return PROMOTION_STATUS_LABELS.submitted;
  if (status === "returned") return PROMOTION_STATUS_LABELS.returned;
  if (status === "decided") return PROMOTION_STATUS_LABELS.decided;
  return status;
}
