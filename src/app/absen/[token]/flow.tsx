"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Loader2, QrCode } from "lucide-react";
import { confirmAttendanceAction, lookupStudentAction } from "./actions";

type Step = "identity" | "verify" | "done";

function formatTimeID(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDateID(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Flow publik siswa: IDENTITAS → VERIFIKASI → KONFIRMASI → SELESAI.
 * Tanpa login. Setelah selesai state identitas dibuang — siswa
 * berikutnya WAJIB scan QR kembali (tidak ada tombol "absen siswa lain").
 */
export default function PublicAttendanceFlow({
  token,
  className,
  label,
  date,
}: {
  token: string;
  className: string;
  label: string;
  date: string;
}) {
  const [step, setStep] = useState<Step>("identity");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<{
    studentId: string;
    fullName: string;
    alreadyCheckedIn: boolean;
    checkedInAt: string | null;
    checkedStatus: string | null;
  } | null>(null);
  const [result, setResult] = useState<{
    fullName: string;
    status: string;
    checkedInAt: string;
    already: boolean;
  } | null>(null);
  const [code, setCode] = useState("");

  function lookup(formData: FormData) {
    setError(null);
    const fullName = String(formData.get("fullName") ?? "");
    const studentCode = String(formData.get("studentCode") ?? "");
    setCode(studentCode);
    startTransition(async () => {
      const res = await lookupStudentAction({ token, fullName, studentCode });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCandidate({
        studentId: String(res.studentId),
        fullName: String(res.fullName),
        alreadyCheckedIn: Boolean(res.alreadyCheckedIn),
        checkedInAt: (res.checkedInAt as string | null) ?? null,
        checkedStatus: (res.checkedStatus as string | null) ?? null,
      });
      setStep("verify");
    });
  }

  function confirm() {
    if (!candidate) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmAttendanceAction({
        token,
        studentId: candidate.studentId,
        studentCode: code,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({
        fullName: String(res.fullName),
        status: String(res.status),
        checkedInAt: String(res.checkedInAt),
        already: Boolean(res.already),
      });
      // Buang identitas — HP yang sama tidak bisa lanjut ke nama lain.
      setCandidate(null);
      setCode("");
      setStep("done");
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          SMART KASEK • Absensi Digital
        </p>
        <h1 className="mt-1 text-xl font-bold">Absensi {className}</h1>
        <p className="text-sm text-muted-foreground">
          {label} • {formatDateID(date)}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {step === "identity" && (
        <form
          action={lookup}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">Silakan identifikasi diri Anda.</p>
          <label className="grid gap-1 text-sm font-medium">
            Nama lengkap
            <input
              name="fullName"
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
              placeholder="Cari nama... tulis persis seperti di kelas"
              className="min-h-[52px] rounded-lg border bg-background px-3 text-base"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            NIS / nomor induk
            <input
              name="studentCode"
              required
              minLength={2}
              maxLength={50}
              autoComplete="off"
              inputMode="numeric"
              placeholder="Sesuai nomor induk sekolah"
              className="min-h-[52px] rounded-lg border bg-background px-3 text-base"
            />
            <span className="text-xs font-normal text-muted-foreground">
              Verifikasi singkat agar tidak asal memilih nama.
            </span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? "Memeriksa..." : "Lanjutkan"}
          </button>
        </form>
      )}

      {step === "verify" && candidate && (
        <div className="space-y-4">
          {candidate.alreadyCheckedIn ? (
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="font-bold">Anda sudah melakukan absensi.</p>
              <p className="tnum mt-1 text-sm text-muted-foreground">
                {candidate.checkedInAt ? formatTimeID(candidate.checkedInAt) : ""} WIB
                {candidate.checkedStatus ? ` • ${candidate.checkedStatus}` : ""}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Satu siswa satu absensi per sesi. Serahkan HP ke teman dan minta ia scan QR kembali.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border p-4 text-sm">
                <p className="font-bold">Konfirmasi Absensi</p>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Nama</dt><dd className="font-semibold">{candidate.fullName}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Kelas</dt><dd className="font-semibold">{className}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Tanggal</dt><dd className="font-semibold">{formatDateID(date)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Waktu</dt><dd className="tnum font-semibold">otomatis dari server</dd></div>
                </dl>
              </div>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pending ? "Menyimpan..." : "Konfirmasi absensi"}
              </button>
            </>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-3 text-center">
          <BadgeCheck className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <p className="text-lg font-bold">
            {result.already ? "Sudah tercatat" : "Absensi berhasil"}
          </p>
          <p className="font-semibold">{result.fullName}</p>
          <p className="tnum text-sm text-muted-foreground">
            {result.status} • {formatTimeID(result.checkedInAt)} WIB
          </p>
          <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            Absensi Anda sudah tercatat. Serahkan HP ke teman dan minta ia <strong>scan QR kembali</strong> —
            halaman ini tidak bisa dipakai untuk siswa lain.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Rekomendasi AI bersifat bahan pertimbangan — verifikasi akhir oleh Kepala Sekolah.
      </p>
    </div>
  );
}
