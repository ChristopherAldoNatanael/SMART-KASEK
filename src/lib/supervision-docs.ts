export type SupervisionDocType =
  | "cp"
  | "atp"
  | "prota"
  | "promes"
  | "modul_ajar"
  | "kokurikuler"
  | "penilaian"
  | "daftar_hadir"
  | "jurnal"
  | "daftar_nilai"
  | "kalender"
  | "jadwal";

export const SUPERVISION_DOC_TYPES: SupervisionDocType[] = [
  "cp",
  "atp",
  "prota",
  "promes",
  "modul_ajar",
  "kokurikuler",
  "penilaian",
  "daftar_hadir",
  "jurnal",
  "daftar_nilai",
  "kalender",
  "jadwal",
];

/** Label Indonesia untuk 12 perangkat pembelajaran. */
export const SUPERVISION_DOC_LABELS: Record<SupervisionDocType, string> = {
  cp: "CP",
  atp: "ATP",
  prota: "Prota",
  promes: "Promes",
  modul_ajar: "Modul Ajar",
  kokurikuler: "Perencanaan Kokurikuler",
  penilaian: "Kisi-kisi, Soal & Analisis Penilaian",
  daftar_hadir: "Daftar Hadir",
  jurnal: "Jurnal Pembelajaran",
  daftar_nilai: "Daftar Nilai",
  kalender: "Kalender Pendidikan",
  jadwal: "Jadwal Pelajaran",
};

/** MIME yang diterima: DOCX diutamakan, DOC/PDF didukung. */
export const SUPERVISION_DOC_MIMES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/pdf",
] as const;

export const SUPERVISION_DOC_MAX_BYTES = 10 * 1024 * 1024;
