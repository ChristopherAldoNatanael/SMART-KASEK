/**
 * Definisi instrumen Supervisi Manajerial (PDF Program Supervisi Guru
 * UPT SDN 226 Gresik 2026/2027, BAB III) + kalkulasi sesuai BAB IV.
 *
 * - Instrumen 1: Kelengkapan Administrasi Kelas — 13 komponen, skor 1–4.
 * - Instrumen 2: Supervisi Perencanaan Kegiatan Pembelajaran — 10 indikator,
 *   Ada/Tidak + catatan.
 * - Instrumen 3: Penyusunan ATP/Silabus — 11 komponen, skor 1–4.
 *
 * Rumus (BAB IV):
 * - Skor 1–4: Nilai = (perolehan / maksimal) × 100.
 * - Ada/Tidak: Ada = 1, Tidak = 0; Nilai = (jumlah Ada / jumlah komponen) × 100.
 * - NM (Nilai Rata-rata Manajerial) = rata-rata Nilai ketiga instrumen.
 * - Kategori PDF: 91–100 Amat Baik, 76–90 Baik, 61–75 Cukup, ≤60 Kurang.
 *
 * CATATAN PERBEDAAN vs instrumen akademik existing
 * (`lib/supervision-instrument.ts` memakai 91/81/71/<71):
 * modul ini memakai ambang PDF 91/76/61 dan TIDAK mengubah fungsi
 * `gradeForValue` existing agar fitur akademik tidak terpengaruh.
 */

export type ManagerialInstrumentKey = "i1" | "i2" | "i3";

export type ManagerialInstrumentStatus = "draft" | "final";

export type ManagerialGrade = "Amat Baik" | "Baik" | "Cukup" | "Kurang";

export type ManagerialScoreItem = {
  key: string;
  label: string;
  /** Detail sub-poin dari PDF (mis. isi papan data). */
  detail?: string;
};

export type ManagerialBinaryItem = {
  key: string;
  label: string;
};

/* ------------------------------ Instrumen 1 ----------------------------- */
/** 13 komponen, skor 1–4. Maksimal = 13 × 4 = 52. */
export const MANAGERIAL_I1_ITEMS: ManagerialScoreItem[] = [
  { key: "i1_01", label: "Data induk/identitas peserta didik" },
  { key: "i1_02", label: "Denah tempat duduk peserta didik" },
  { key: "i1_03", label: "Struktur organisasi kelas" },
  { key: "i1_04", label: "Tata tertib kelas" },
  { key: "i1_05", label: "Jadwal pelajaran kelas" },
  { key: "i1_06", label: "Jadwal piket kebersihan kelas" },
  { key: "i1_07", label: "Buku kemajuan kelas/agenda kelas" },
  {
    key: "i1_08",
    label: "Papan data/pajangan kelas",
    detail:
      "Visi-misi sekolah, dimensi lulusan, Profil Pelajar Pancasila, hasil karya siswa, 7 KAIH, stop bullying, 7 kebudayaan malu",
  },
  { key: "i1_09", label: "Buku catatan mutasi peserta didik" },
  { key: "i1_10", label: "Grafik/rekap analisis kehadiran peserta didik" },
  { key: "i1_11", label: "Buku catatan bimbingan/kasus peserta didik" },
  { key: "i1_12", label: "Inventaris sarana dan prasarana kelas" },
  {
    key: "i1_13",
    label: "Dokumen kesepakatan kelas/keyakinan kelas yang disusun bersama siswa",
  },
];

export const MANAGERIAL_I1_MAX = MANAGERIAL_I1_ITEMS.length * 4; // 52

/* ------------------------------ Instrumen 2 ----------------------------- */
/** 10 indikator, Ada/Tidak + catatan. */
export const MANAGERIAL_I2_ITEMS: ManagerialBinaryItem[] = [
  { key: "i2_01", label: "Analisis CP menjadi TP" },
  {
    key: "i2_02",
    label: "ATP disusun secara sistematis dan berkesinambungan",
  },
  {
    key: "i2_03",
    label: "Prota/Promes sesuai kalender pendidikan",
  },
  {
    key: "i2_04",
    label:
      "Modul ajar memuat komponen pembelajaran mendalam (mindful, meaningful, joyful)",
  },
  {
    key: "i2_05",
    label:
      "Strategi pembelajaran berdiferensiasi berdasarkan asesmen diagnostik",
  },
  { key: "i2_06", label: "Penguatan Profil Pelajar Pancasila" },
  {
    key: "i2_07",
    label:
      "Bentuk/teknik asesmen (diagnostik, formatif, sumatif) beserta rubrik",
  },
  { key: "i2_08", label: "Remedial dan pengayaan" },
  { key: "i2_09", label: "Media/sumber belajar/teknologi" },
  {
    key: "i2_10",
    label: "Refleksi peserta didik dalam tindak lanjut perencanaan",
  },
];

/* ------------------------------ Instrumen 3 ----------------------------- */
/** 11 komponen, skor 1–4. Maksimal = 11 × 4 = 44. */
export const MANAGERIAL_I3_ITEMS: ManagerialScoreItem[] = [
  {
    key: "i3_01",
    label: "Identitas mata pelajaran/fase/kelas lengkap",
  },
  { key: "i3_02", label: "CP dijabarkan secara utuh sesuai fase" },
  { key: "i3_03", label: "TP operasional dan terukur" },
  {
    key: "i3_04",
    label: "ATP logis dan berkesinambungan sesuai lingkup materi",
  },
  { key: "i3_05", label: "Alokasi waktu proporsional dengan Promes" },
  {
    key: "i3_06",
    label: "Materi relevan dengan kehidupan peserta didik (meaningful)",
  },
  {
    key: "i3_07",
    label: "Model pembelajaran mendukung suasana menyenangkan (joyful)",
  },
  {
    key: "i3_08",
    label: "Refleksi/kesadaran belajar (mindful) pada setiap urutan",
  },
  {
    key: "i3_09",
    label: "Profil Pelajar Pancasila terintegrasi pada setiap lingkup materi",
  },
  {
    key: "i3_10",
    label: "Asesmen formatif/sumatif sesuai tujuan pembelajaran",
  },
  { key: "i3_11", label: "Sumber/media pembelajaran bervariasi" },
];

export const MANAGERIAL_I3_MAX = MANAGERIAL_I3_ITEMS.length * 4; // 44

/* ------------------------------- Kalkulasi ------------------------------ */

export const SCORE_LABELS: Record<number, string> = {
  1: "Belum Terlihat",
  2: "Mulai Terlihat",
  3: "Berkembang",
  4: "Membudaya / Sangat Baik",
};

/** Nilai 2 desimal dari perolehan vs maksimal. */
export function calcManagerialScoreValue(
  obtained: number,
  max: number
): number {
  if (max <= 0) return 0;
  return Math.round((obtained / max) * 100 * 100) / 100;
}

/** Nilai Instrumen 2: (jumlah "Ada" / 10) × 100. */
export function calcManagerialBinaryValue(presentCount: number): number {
  return calcManagerialScoreValue(presentCount, MANAGERIAL_I2_ITEMS.length);
}

/** Kategori PDF: 91–100 / 76–90 / 61–75 / ≤60. */
export function managerialGradeForValue(value: number): ManagerialGrade {
  if (value >= 91) return "Amat Baik";
  if (value >= 76) return "Baik";
  if (value >= 61) return "Cukup";
  return "Kurang";
}

/** NM = rata-rata nilai instrumen yang tersedia (final: rata-rata ketiganya). */
export function calcManagerialOverall(
  values: (number | null | undefined)[]
): number | null {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

export function isValidManagerialScore(score: unknown): score is number {
  return (
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 1 &&
    score <= 4
  );
}


