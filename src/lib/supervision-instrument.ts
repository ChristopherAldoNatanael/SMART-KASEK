import {
  SUPERVISION_DOC_LABELS,
  SUPERVISION_DOC_TYPES,
  type SupervisionDocType,
} from "./supervision-docs";

/**
 * Konstanta murni instrumen penilaian 12 aspek (tanpa "use server"
 * agar bisa dipakai service, schema, maupun komponen client).
 *
 * Rumus: Nilai = (Jumlah Skor / Skor Maksimum) x 100,
 * Skor Maksimum = 12 aspek x 4 = 48.
 */

export const INSTRUMENT_ASPECT_COUNT = 12;
export const INSTRUMENT_MAX_PER_ASPECT = 4;
export const INSTRUMENT_MAX_SCORE =
  INSTRUMENT_ASPECT_COUNT * INSTRUMENT_MAX_PER_ASPECT; // 48

export type InstrumentGrade = "Amat Baik" | "Baik" | "Cukup" | "Kurang";

export type InstrumentStatus = "draft" | "final";

export type InstrumentAspect = {
  docType: SupervisionDocType;
  label: string;
};

export const INSTRUMENT_ASPECTS: InstrumentAspect[] = SUPERVISION_DOC_TYPES.map(
  (docType) => ({ docType, label: SUPERVISION_DOC_LABELS[docType] })
);

export type InstrumentItemInput = {
  docType: SupervisionDocType;
  present: boolean;
  score: number | null;
  note?: string;
};

/** Nilai akhir 2 desimal dari jumlah skor. */
export function calcInstrumentValue(totalScore: number): number {
  return Math.round((totalScore / INSTRUMENT_MAX_SCORE) * 100 * 100) / 100;
}

export function totalInstrumentScore(
  items: { score: number | null | undefined }[]
): number {
  return items.reduce(
    (sum, i) => sum + (typeof i.score === "number" ? i.score : 0),
    0
  );
}

/** Kategori sesuai instrumen: 91-100 / 81-90 / 71-80 / <71. */
export function gradeForValue(value: number): InstrumentGrade {
  if (value >= 91) return "Amat Baik";
  if (value >= 81) return "Baik";
  if (value >= 71) return "Cukup";
  return "Kurang";
}

export function isValidInstrumentScore(score: unknown): score is number {
  return (
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 1 &&
    score <= INSTRUMENT_MAX_PER_ASPECT
  );
}
