"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, GraduationCap, TrendingUp } from "lucide-react";
import {
  getPromoteClassesAction,
  promoteStudentsAction,
} from "@/app/(shell)/students/actions";
import {
  isFinalYearClass,
  nextAcademicYear,
  suggestNextClass,
  yearAfter,
} from "@/lib/students";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import type { PromotePreview } from "@/services/student.service";

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

type Mapping = { to: string; graduate: boolean };

function keyOf(className: string | null): string {
  return className ?? "";
}

function labelOf(className: string | null): string {
  return className ? `Kelas ${className}` : "Tanpa kelas";
}

function ProcessButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      <TrendingUp className="h-5 w-5" aria-hidden />
      {pending ? "Memproses..." : "Proses kenaikan kelas"}
    </button>
  );
}

/**
 * Kenaikan kelas dinamis:
 * 1) pilih tahun asal & tujuan → 2) tampilkan daftar kelas →
 * 3) atur kelas tujuan tiap kelas (sudah terisi otomatis, bisa diubah;
 *    kelas VI otomatis ditandai lulus) → 4) proses.
 * Aman dijalankan ulang: siswa yang sudah ada di tahun tujuan dilewati.
 */
export default function StudentPromotePanel({
  yearOptions,
  initialSourceYear,
  classOptions,
}: {
  yearOptions: string[];
  initialSourceYear: string;
  /** Saran kelas tujuan dari daftar master (tetap bisa diketik manual). */
  classOptions?: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [sourceYear, setSourceYear] = useState(initialSourceYear);
  const [targetYear, setTargetYear] = useState(
    () => yearAfter(initialSourceYear) ?? nextAcademicYear()
  );
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PromotePreview | null>(null);
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});

  const [promoteState, promoteAction] = useFormState(promoteStudentsAction, {
    ok: false,
    error: null,
    message: null,
  });

  const lastPromote = useRef(promoteState);
  // Pola toast-after-action yang sama dipakai di seluruh form aplikasi.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lastPromote.current !== promoteState) {
      lastPromote.current = promoteState;
      if (promoteState.error) {
        toast.error("Belum berhasil memproses", promoteState.error);
      } else if (promoteState.ok) {
        toast.success(
          "Kenaikan kelas selesai",
          promoteState.message ?? undefined
        );
        setPreview(null);
        setMappings({});
        startTransition(() => router.refresh());
      }
    }
  });

  async function loadClasses() {
    setLoading(true);
    setPreview(null);
    const result = await getPromoteClassesAction(sourceYear);
    setLoading(false);
    if (!result.ok) {
      toast.error("Belum berhasil memuat", result.error ?? "Coba lagi.");
      return;
    }
    if (result.classes.length === 0) {
      toast.error(
        "Tidak ada data",
        `Tidak ada siswa pada tahun ajaran ${sourceYear}.`
      );
      return;
    }
    setPreview(result.classes);
    const init: Record<string, Mapping> = {};
    for (const c of result.classes) {
      init[keyOf(c.className)] = {
        to: c.className ? (suggestNextClass(c.className) ?? "") : "",
        graduate: c.className ? isFinalYearClass(c.className) : false,
      };
    }
    setMappings(init);
  }

  function setTo(key: string, to: string) {
    setMappings((prev) => ({ ...prev, [key]: { ...prev[key], to } }));
  }

  function setGraduate(key: string, graduate: boolean) {
    setMappings((prev) => ({ ...prev, [key]: { ...prev[key], graduate } }));
  }

  const mappingsJson = JSON.stringify(
    Object.entries(mappings).map(([from, m]) => ({
      fromClass: from,
      toClass: m.graduate ? "" : m.to.trim(),
      graduate: m.graduate,
    }))
  );

  const movableCount = (preview ?? []).filter((c) => c.active > 0).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-600/20 bg-sky-50 p-4 text-[15px] leading-relaxed text-sky-900">
        <p className="font-bold">Cara pakai:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Pilih tahun asal dan tahun tujuan, lalu tekan “Tampilkan daftar kelas”.</li>
          <li>
            Kolom tujuan sudah terisi otomatis (I→II, II→III, dst.) — silakan
            diubah bila perlu.
          </li>
          <li>
            Kelas VI otomatis ditandai <strong>Lulus</strong> (tidak naik kelas).
          </li>
          <li>Tekan “Proses kenaikan kelas”. Data lama tidak diubah.</li>
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="pr-asal" className="text-[15px] font-semibold">
            Tahun asal
          </label>
          <select
            id="pr-asal"
            value={sourceYear}
            onChange={(e) => {
              const next = e.target.value;
              setSourceYear(next);
              setTargetYear(yearAfter(next) ?? nextAcademicYear());
              setPreview(null);
            }}
            className={inputClass}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pr-tujuan" className="text-[15px] font-semibold">
            Tahun tujuan
          </label>
          <select
            id="pr-tujuan"
            value={targetYear}
            onChange={(e) => {
              setTargetYear(e.target.value);
              setPreview(null);
            }}
            className={inputClass}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={loadClasses}
          disabled={loading || sourceYear === targetYear}
          title={
            sourceYear === targetYear
              ? "Tahun asal dan tujuan tidak boleh sama"
              : undefined
          }
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Tampilkan daftar kelas"}
        </button>
      </div>

      {preview && (
        <form action={promoteAction} className="space-y-3">
          <input type="hidden" name="sourceYear" value={sourceYear} />
          <input type="hidden" name="targetYear" value={targetYear} />
          <input type="hidden" name="mappingsJson" value={mappingsJson} />

          <ol className="grid gap-3 lg:grid-cols-2">
            {preview.map((c) => {
              const key = keyOf(c.className);
              const m = mappings[key] ?? { to: "", graduate: false };
              const disabled = c.active === 0;
              return (
                <li
                  key={key || "__none__"}
                  className={cn(
                    "rounded-xl border bg-card p-4",
                    disabled && "opacity-60"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-muted px-3 py-1.5 text-[15px] font-bold">
                      {labelOf(c.className)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {c.active} siswa aktif
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {m.graduate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-[15px] font-bold text-emerald-800">
                        <GraduationCap className="h-4 w-4" aria-hidden />
                        Lulus
                      </span>
                    ) : (
                      <>
                        <input
                          aria-label={`Kelas tujuan untuk ${labelOf(c.className)}`}
                          value={m.to}
                          onChange={(e) => setTo(key, e.target.value)}
                          disabled={disabled}
                          maxLength={50}
                          list="pr-tujuan-saran"
                          placeholder="Pilih / tulis kelas tujuan..."
                          className={cn(inputClass, "min-h-[44px] flex-1 sm:min-w-32")}
                        />
                        <datalist id="pr-tujuan-saran">
                          {(classOptions ?? []).map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>
                  <label className="mt-2.5 flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px]">
                    <input
                      type="checkbox"
                      checked={m.graduate}
                      disabled={disabled}
                      onChange={(e) => setGraduate(key, e.target.checked)}
                      className="h-5 w-5 accent-emerald-700"
                    />
                    Luluskan (tidak naik kelas)
                  </label>
                  {disabled && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tidak ada siswa aktif di kelas ini — dilewati.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {movableCount === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-[15px] text-muted-foreground">
              Tidak ada siswa aktif pada tahun {sourceYear} untuk diproses.
            </p>
          ) : (
            <ProcessButton disabled={false} />
          )}
        </form>
      )}
    </div>
  );
}
