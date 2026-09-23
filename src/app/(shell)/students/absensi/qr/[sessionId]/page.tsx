import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSessionLiveStats } from "@/services/attendance-session.service";
import SessionAutoRefresh from "@/components/students/session-auto-refresh";

export const dynamic = "force-dynamic";

function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim();
  return raw.replace(/\/+$/, "");
}

export default async function SessionQrPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user?.schoolId) {
    return <p className="p-6">Akun Anda belum terhubung ke sekolah.</p>;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance_sessions")
    .select("id, school_id, class_name, academic_year, label, date, status, qr_token, late_after, ends_at")
    .eq("id", sessionId)
    .single();
  const session = data as {
    id: string;
    school_id: string;
    class_name: string;
    academic_year: string;
    label: string;
    date: string;
    status: string;
    qr_token: string;
    late_after: string | null;
    ends_at: string | null;
  } | null;
  if (!session || session.school_id !== user.schoolId) {
    return <p className="p-6">Sesi tidak ditemukan.</p>;
  }

  const [qrDataUrl, stats] = await Promise.all([
    QRCode.toDataURL(`${siteUrl()}/absen/${session.qr_token}`, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
    }).catch(() => null),
    getSessionLiveStats(session.id).catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 text-center">
      <SessionAutoRefresh enabled={session.status === "open"} />
      <Link
        href={`/students/absensi?tahun=${encodeURIComponent(session.academic_year)}&kelas=${encodeURIComponent(session.class_name)}&tanggal=${encodeURIComponent(session.date)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Kembali ke absensi {session.class_name}
      </Link>
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-lg font-bold tracking-wide text-slate-900">ABSENSI {session.class_name}</p>
        <p className="text-sm text-slate-500">{session.label}</p>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`QR absensi Kelas ${session.class_name}`}
            className="mx-auto mt-6 h-72 w-72 sm:h-80 sm:w-80"
            width={320}
            height={320}
          />
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">QR gagal dibuat.</p>
        )}
        <p className="mt-4 text-base text-slate-600">Scan untuk absensi</p>
        <p className="mt-1 text-sm text-slate-500">
          {session.status === "open" ? "Sesi terbuka" : "Sesi ditutup — QR tidak berlaku"}
        </p>
        {stats && (
          <p className="tnum mt-3 text-2xl font-bold text-slate-900">
            {stats.hadir + stats.terlambat} / {stats.total} siswa sudah absen
          </p>
        )}
      </div>
    </div>
  );
}
