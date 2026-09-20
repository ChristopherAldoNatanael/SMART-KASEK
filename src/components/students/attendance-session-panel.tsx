import Link from "next/link";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { ATTENDANCE_SHORT, type AttendanceStatus } from "@/lib/students";
import { cn } from "@/lib/utils";
import {
  getSessionCheckins,
  getSessionLiveStats,
  listSessionsForClass,
} from "@/services/attendance-session.service";
import { Panel } from "@/components/common";
import SessionAutoRefresh from "./session-auto-refresh";
import { CloseSessionButton, CreateSessionForm } from "./session-forms";

function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim();
  return raw.replace(/\/+$/, "");
}

/**
 * Panel sesi QR di halaman absensi guru.
 * REUSE: angka & rekap tetap dari class_attendance.
 */
export default async function AttendanceSessionPanel({
  academicYear,
  className,
  date,
}: {
  academicYear: string;
  className: string;
  date: string;
}) {
  let sessions: Awaited<ReturnType<typeof listSessionsForClass>> = [];
  try {
    sessions = await listSessionsForClass({ academicYear, className, date });
  } catch {
    sessions = [];
  }
  const open = sessions.find((s) => s.status === "open") ?? null;

  let stats: { total: number; hadir: number; terlambat: number; belum: number } | null = null;
  let checkins: Awaited<ReturnType<typeof getSessionCheckins>> = [];
  let qrDataUrl: string | null = null;
  if (open) {
    try {
      [stats, checkins] = await Promise.all([
        getSessionLiveStats(open.id),
        getSessionCheckins(open.id),
      ]);
    } catch {
      stats = null;
      checkins = [];
    }
    try {
      qrDataUrl = await QRCode.toDataURL(`${siteUrl()}/absen/${open.qr_token}`, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrDataUrl = null;
    }
  }

  return (
    <Panel
      title="QR Absensi Digital"
      description={
        open
          ? `Sesi "${open.label}" terbuka. Siswa scan QR → ketuk nama → konfirmasi. Satu HP boleh bergantian, tiap siswa 1 absensi, siswa berikutnya scan ulang.`
          : "Belum ada sesi QR terbuka hari ini. Buka sesi agar siswa bisa absen lewat scan tanpa login."
      }
    >
      <SessionAutoRefresh enabled={open !== null} />
      {!open ? (
        <CreateSessionForm academicYear={academicYear} className={className} date={date} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="mx-auto w-full max-w-[320px] rounded-2xl border bg-white p-4 text-center shadow-sm">
            <p className="text-sm font-bold text-slate-900">ABSENSI {className}</p>
            <p className="text-xs text-slate-500">{open.label}</p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR absensi Kelas ${className}`}
                className="mx-auto mt-3 h-56 w-56"
                width={224}
                height={224}
              />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">QR gagal dibuat. Muat ulang halaman.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Scan untuk absensi</p>
            {stats && (
              <p className="tnum mt-1 text-sm font-bold text-slate-900">
                {stats.hadir + stats.terlambat} / {stats.total} siswa sudah absen
              </p>
            )}
            <Link
              href={`/students/absensi/qr/${open.id}`}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              <QrCode className="mr-1.5 h-4 w-4" aria-hidden />
              Tampilkan layar penuh (proyektor)
            </Link>
          </div>
          <div className="space-y-3">
            {stats && (
              <div className="flex flex-wrap gap-2 text-sm font-semibold" role="status" aria-label="Hitungan sesi">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">H: {stats.hadir}</span>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">T: {stats.terlambat}</span>
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Belum: {stats.belum}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Waktu kehadiran dicatat dari server. Lewat batas = Terlambat otomatis. Data langsung masuk daftar
              hadir dan rekap di bawah.
            </p>
            {checkins.length > 0 && (
              <div>
                <p className="text-sm font-bold">Tercatat hari ini ({checkins.length})</p>
                <ol className="mt-2 max-h-56 space-y-1.5 overflow-auto rounded-lg border bg-muted/30 p-2.5">
                  {checkins.map((c, i) => (
                    <li
                      key={`${c.fullName}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate font-semibold">
                        <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                        {c.fullName}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            c.status === "hadir" && "bg-emerald-100 text-emerald-800",
                            c.status === "terlambat" && "bg-orange-100 text-orange-800",
                            c.status === "izin" && "bg-sky-100 text-sky-800",
                            c.status === "sakit" && "bg-amber-100 text-amber-800",
                            c.status === "alpa" && "bg-red-100 text-red-800"
                          )}
                        >
                          {ATTENDANCE_SHORT[c.status as AttendanceStatus] ?? c.status}
                        </span>
                        <span
                          className="tnum text-xs font-bold text-sky-800"
                          title={
                            c.method === "qr"
                              ? "Via scan QR (waktu server)"
                              : "Input manual guru"
                          }
                        >
                          {c.time ?? "—"}
                          {c.method === "qr" ? "" : "*"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jam bertanda * = input manual guru.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <CloseSessionButton sessionId={open.id} />
              <Link
                href={`/students/absensi/rekap?bulan=${date.slice(0, 7)}&kelas=${encodeURIComponent(className)}`}
                className="inline-flex min-h-[48px] items-center rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
              >
                Lihat rekap
              </Link>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
