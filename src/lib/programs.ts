/**
 * Helper murni Program Sekolah (dipakai server maupun client).
 *
 * Aturan progres (deterministik, tertulis di UI agar jujur):
 * - Selesai → 100%
 * - Direncanakan → 0%
 * - Dibatalkan → null (tidak ikut rata-rata)
 * - Berjalan + tanggal lengkap → % waktu berjalan, 1–99
 *   (lewat tenggat tapi belum selesai = 99, sinyal menagih)
 * - Berjalan tanpa tanggal lengkap → ~50% (estimasi, ditandai)
 */

export const PROGRAM_STATUSES = [
  "planned",
  "ongoing",
  "completed",
  "cancelled",
] as const;

export type ProgramStatusValue = (typeof PROGRAM_STATUSES)[number];

export const PROGRAM_STATUS_LABELS: Record<ProgramStatusValue, string> = {
  planned: "Rencana",
  ongoing: "Berjalan",
  completed: "Selesai",
  cancelled: "Batal",
};

export type ProgramProgress = {
  /** Null khusus program yang dibatalkan (tidak ikut rata-rata). */
  percent: number | null;
  /** True bila angka sekadar estimasi (berjalan tanpa tanggal lengkap). */
  estimated: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(v: string | null | undefined): number | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return null;
  const t = new Date(`${v.trim()}T00:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

export function programProgress(
  row: {
    status: ProgramStatusValue;
    start_date: string | null;
    end_date: string | null;
  },
  today: Date = new Date()
): ProgramProgress {
  if (row.status === "completed") return { percent: 100, estimated: false };
  if (row.status === "cancelled") return { percent: null, estimated: false };
  if (row.status === "planned") return { percent: 0, estimated: false };

  const start = parseDate(row.start_date);
  const end = parseDate(row.end_date);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (start === null || end === null || end <= start) {
    return { percent: 50, estimated: true };
  }
  if (now <= start) return { percent: 0, estimated: false };
  if (now >= end) return { percent: 99, estimated: false };
  const pct = Math.round(((now - start) / (end - start)) * 100);
  return { percent: Math.min(99, Math.max(1, pct)), estimated: false };
}

export type ProgramSummary = {
  total: number;
  planned: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  /** Rata-rata progres (tanpa yang dibatalkan). Null bila tidak ada program aktif. */
  overall: number | null;
};

export function summarizePrograms(
  rows: {
    status: ProgramStatusValue;
    start_date: string | null;
    end_date: string | null;
  }[],
  today: Date = new Date()
): ProgramSummary {
  const summary: ProgramSummary = {
    total: rows.length,
    planned: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    overall: null,
  };
  const percents: number[] = [];
  for (const r of rows) {
    if (r.status === "planned") summary.planned++;
    else if (r.status === "ongoing") summary.ongoing++;
    else if (r.status === "completed") summary.completed++;
    else summary.cancelled++;
    const p = programProgress(r, today);
    if (p.percent !== null) percents.push(p.percent);
  }
  if (percents.length > 0) {
    summary.overall = Math.round(
      percents.reduce((a, b) => a + b, 0) / percents.length
    );
  }
  return summary;
}

/** Semester berjalan (Juli–Des = 1, Jan–Jun = 2, kalender sekolah). */
export function currentSemester(now: Date = new Date()): 1 | 2 {
  return now.getMonth() + 1 >= 7 ? 1 : 2;
}

export function semesterLabel(semester: number | null | undefined): string {
  return semester === 2 ? "Semester 2" : semester === 1 ? "Semester 1" : "—";
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function parts(iso: string): { d: number; m: number; y: number } | null {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { d: Number(m[3]), m: Number(m[2]), y: Number(m[1]) };
}

/**
 * Rentang tanggal gaya dokumen sekolah:
 * "13 Juli 2026" · "13 - 17 Juli 2026" · "28 September - 2 Oktober 2026".
 * Tanpa tanggal → "—".
 */
export function formatActivityDate(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const s = start ? parts(start) : null;
  const e = end ? parts(end) : null;
  if (!s && !e) return "—";
  if (!s) return `${e!.d} ${MONTHS_ID[e!.m - 1]} ${e!.y}`;
  if (!e || (s.d === e.d && s.m === e.m && s.y === e.y)) {
    return `${s.d} ${MONTHS_ID[s.m - 1]} ${s.y}`;
  }
  if (s.m === e.m && s.y === e.y) {
    return `${s.d} - ${e.d} ${MONTHS_ID[s.m - 1]} ${s.y}`;
  }
  if (s.y === e.y) {
    return `${s.d} ${MONTHS_ID[s.m - 1]} - ${e.d} ${MONTHS_ID[e.m - 1]} ${e.y}`;
  }
  return `${s.d} ${MONTHS_ID[s.m - 1]} ${s.y} - ${e.d} ${MONTHS_ID[e.m - 1]} ${e.y}`;
}

/** "2026-09-20" → "20 Sep 2026". Null/invalid → "—". */
export function formatShortDateID(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return "—";
  return new Date(`${iso.trim()}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Angka → "Rp 1.500.000". Null/NaN → "—". NUMERIC Supabase bisa string. */
export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}
