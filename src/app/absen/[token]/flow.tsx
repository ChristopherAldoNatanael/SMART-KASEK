"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, CircleCheck, Loader2, QrCode } from "lucide-react";
import {
  confirmAttendanceAction,
  previewStudentAction,
  searchStudentsAction,
} from "./actions";
import { ATTENDANCE_LABELS } from "@/lib/students";
import { cn } from "@/lib/utils";

function statusLabel(status: string): string {
  return (ATTENDANCE_LABELS as Record<string, string>)[status] ?? status;
}

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
 * Flow publik siswa: PILIH NAMA → "YA, INI SAYA" → KONFIRMASI → SELESAI.
 * Tanpa login, tanpa ketik NIS. Verifikasi singkat = pengakuan eksplisit
 * + pengawasan guru lewat rekap live (titip absen langsung terlihat).
 * Setelah selesai state dibuang — siswa berikutnya WAJIB scan QR kembali.
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
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<{
    fullName: string;
    status: string;
    checkedInAt: string;
    already: boolean;
  } | null>(null);
  // Combobox nama: ketik 2 huruf → ketuk nama dari daftar.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ studentId: string; fullName: string }[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setListOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await searchStudentsAction({ token, query: q });
      if (reqId.current !== id) return;
      setSearching(false);
      setResults(res.results);
      setListOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query, token]);

  function pickAndPreview(m: { studentId: string; fullName: string }) {
    setQuery(m.fullName);
    setListOpen(false);
    setError(null);
    setAcknowledged(false);
    startTransition(async () => {
      const res = await previewStudentAction({ token, studentId: m.studentId });
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
    if (!candidate || !acknowledged) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmAttendanceAction({
        token,
        studentId: candidate.studentId,
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
      setAcknowledged(false);
      setQuery("");
      setResults([]);
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
        <div className="space-y-3">
          <p className="text-center text-[15px]">
            Ketik <strong>2 huruf</strong> namamu,
            <br />
            lalu <strong>ketuk namamu</strong> di daftar.
          </p>
          <div className="relative">
            <label htmlFor="qr-fullname" className="sr-only">
              Cari nama
            </label>
            <input
              id="qr-fullname"
              autoComplete="off"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls="qr-namelist"
              aria-autocomplete="list"
              placeholder="cth. ketik “al”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setListOpen(false), 150)}
              onFocus={() => {
                if (results.length > 0) setListOpen(true);
              }}
              className="min-h-[56px] w-full rounded-xl border-2 bg-background px-4 text-lg"
            />
            {listOpen && (
              <ul
                id="qr-namelist"
                role="listbox"
                aria-label="Hasil pencarian nama"
                className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-xl border-2 bg-card shadow-lg"
              >
                {searching && (
                  <li className="flex items-center gap-2 px-4 py-3.5 text-[15px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Mencari...
                  </li>
                )}
                {!searching &&
                  results.map((m) => (
                    <li key={m.studentId} role="option" aria-selected="false">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickAndPreview(m)}
                        disabled={pending}
                        className="flex min-h-[56px] w-full items-center px-4 text-left text-[17px] font-semibold transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                        {m.fullName}
                      </button>
                    </li>
                  ))}
                {!searching && results.length === 0 && query.trim().length >= 2 && (
                  <li className="px-4 py-3.5 text-[15px] text-muted-foreground">
                    Tidak ketemu — periksa ejaan atau hubungi guru.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {step === "verify" && candidate && (
        <div className="space-y-4">
          {candidate.alreadyCheckedIn ? (
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="font-bold">Kamu sudah absen hari ini.</p>
              <p className="tnum mt-1 text-sm text-muted-foreground">
                {candidate.checkedInAt ? formatTimeID(candidate.checkedInAt) : ""} WIB
                {candidate.checkedStatus ? ` • ${statusLabel(candidate.checkedStatus)}` : ""}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Satu anak satu absensi. Serahkan HP ke teman dan minta ia scan QR kembali.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border-2 p-5 text-center">
                <p className="text-sm text-muted-foreground">Kamu akan absen sebagai</p>
                <p className="mt-1 text-2xl font-bold leading-snug">{candidate.fullName}</p>
                <p className="tnum mt-1 text-sm text-muted-foreground">
                  Kelas {className} • {formatDateID(date)}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={acknowledged}
                onClick={() => setAcknowledged((v) => !v)}
                className={cn(
                  "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border-2 text-[17px] font-bold transition-colors",
                  acknowledged
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-border bg-background hover:border-emerald-600/60 hover:bg-emerald-50"
                )}
              >
                <CircleCheck className="h-5 w-5" aria-hidden />
                {acknowledged ? "Ya, ini saya!" : "Ketuk: Ya, ini saya"}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending || !acknowledged}
                className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
              >
                {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
                {pending ? "Menyimpan..." : "Absen sekarang"}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Isi dengan jujur ya — absen untuk teman terlihat di rekap guru.
              </p>
            </>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-3 text-center">
          <BadgeCheck className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <p className="text-lg font-bold">
            {result.already ? "Absensimu sudah tercatat" : "Absensi berhasil"}
          </p>
          <p className="font-semibold">{result.fullName}</p>
          <p className="tnum text-sm text-muted-foreground">
            {statusLabel(result.status)} • {formatTimeID(result.checkedInAt)} WIB
          </p>
          <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            Serahkan HP ke teman dan minta ia <strong>scan QR kembali</strong> —
            halaman ini tidak bisa dipakai anak lain.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Rekomendasi AI bersifat bahan pertimbangan — verifikasi akhir oleh Kepala Sekolah.
      </p>
    </div>
  );
}
