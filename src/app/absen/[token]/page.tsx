import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import { getPublicSessionByToken } from "@/services/attendance-session.service";
import PublicAttendanceFlow from "./flow";

export const dynamic = "force-dynamic";

// Sesi absensi tidak boleh terindeks mesin pencari — hanya lewat QR guru.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicAttendancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let session: Awaited<ReturnType<typeof getPublicSessionByToken>> | null = null;
  let loadError: string | null = null;
  try {
    session = await getPublicSessionByToken(token);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "QR tidak valid.";
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      {!session || loadError ? (
        <div className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <QrCode className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-bold">QR Absensi Tidak Aktif</h1>
          <p className="text-sm text-muted-foreground">
            {loadError ?? "Sesi absensi sudah ditutup atau QR tidak valid."}
          </p>
          <p className="text-sm text-muted-foreground">
            Silakan scan QR absensi yang ditampilkan guru, atau hubungi guru jika ada kesalahan.
          </p>
        </div>
      ) : !session.isOpen ? (
        <div className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <QrCode className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-bold">Sesi Absensi Sudah Ditutup</h1>
          <p className="text-sm text-muted-foreground">
            Sesi {session.label} Kelas {session.className} sudah ditutup atau kedaluwarsa. Silakan hubungi guru
            jika ada kesalahan.
          </p>
        </div>
      ) : (
        <PublicAttendanceFlow
          token={token}
          className={session.className}
          label={session.label}
          date={session.date}
        />
      )}
    </main>
  );
}
