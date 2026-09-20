"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { ATTENDANCE_LABELS, type AttendanceStatus } from "@/lib/students";
import { toast } from "@/components/toaster";

export type DailyExportRow = {
  nama: string;
  nis: string | null;
  status: AttendanceStatus | null;
  jam: string | null;
};

export type RecapExportRow = {
  nama: string;
  nis: string | null;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  percent: number;
};

/** Nama file aman Windows: ganti \ / ? % * : | " < > dengan "-". */
function safeFileName(name: string): string {
  return name.replace(/[\\/ ?%*:|"<>]/g, "-");
}

async function writeExcel(
  filename: string,
  sheetName: string,
  header: string[],
  body: (string | number)[][],
  widths: number[]
): Promise<void> {
  // Dynamic import agar bundle halaman tidak membengkak (pola yang sama
  // dipakai student-import-panel untuk template Excel).
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, safeFileName(filename));
}

const BTN_CLASS =
  "inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

/**
 * Ekspor absensi harian 1 kelas 1 tanggal.
 * Data = record tersimpan (bukan coretan belum-disimpan di form).
 */
export function ExportDailyExcelButton({
  className,
  date,
  dateLabel,
  rows,
}: {
  className: string;
  date: string;
  dateLabel: string;
  rows: DailyExportRow[];
}) {
  const [busy, setBusy] = useState(false);

  async function onExport() {
    if (rows.length === 0 || busy) return;
    setBusy(true);
    try {
      const body = rows.map((r, i) => [
        i + 1,
        r.nama,
        r.nis ?? "-",
        r.status ? ATTENDANCE_LABELS[r.status] : "Belum Absen",
        r.jam ?? "-",
      ]);
      await writeExcel(
        `Absensi-${className}-${date}.xlsx`,
        "Absensi",
        ["No", "Nama", "NIS", "Status", "Jam"],
        body,
        [6, 32, 16, 14, 10]
      );
      toast.success(
        "Excel terunduh",
        `Absensi Kelas ${className} tanggal ${dateLabel}: ${rows.length} siswa.`
      );
    } catch (error) {
      console.error("exportDailyExcel error:", error);
      toast.error("Gagal mengekspor", "Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={busy || rows.length === 0}
      aria-label={`Ekspor Excel absensi Kelas ${className} tanggal ${dateLabel}`}
      className={BTN_CLASS}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      {busy ? "Menyiapkan..." : "Ekspor Excel"}
    </button>
  );
}

/** Ekspor rekap bulanan 1 kelas (dari data rekap yang tampil). */
export function ExportRecapExcelButton({
  className,
  month,
  monthLabel,
  rows,
}: {
  className: string;
  month: string;
  monthLabel: string;
  rows: RecapExportRow[];
}) {
  const [busy, setBusy] = useState(false);

  async function onExport() {
    if (rows.length === 0 || busy) return;
    setBusy(true);
    try {
      const body = rows.map((r, i) => [
        i + 1,
        r.nama,
        r.nis ?? "-",
        r.hadir,
        r.terlambat,
        r.izin,
        r.sakit,
        r.alpa,
        `${r.percent}%`,
      ]);
      await writeExcel(
        `Rekap-Absensi-${className}-${month}.xlsx`,
        "Rekap",
        ["No", "Nama", "NIS", "Hadir", "Terlambat", "Izin", "Sakit", "Alpa", "Kehadiran"],
        body,
        [6, 32, 16, 8, 11, 8, 8, 8, 12]
      );
      toast.success(
        "Excel terunduh",
        `Rekap Kelas ${className} bulan ${monthLabel}: ${rows.length} siswa.`
      );
    } catch (error) {
      console.error("exportRecapExcel error:", error);
      toast.error("Gagal mengekspor", "Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={busy || rows.length === 0}
      aria-label={`Ekspor Excel rekap Kelas ${className} bulan ${monthLabel}`}
      className={BTN_CLASS}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      {busy ? "Menyiapkan..." : "Ekspor Excel"}
    </button>
  );
}
