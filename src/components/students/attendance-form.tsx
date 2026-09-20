"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { saveAttendanceAction } from "@/app/(shell)/students/actions";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_SHORT,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/students";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

export type AttendanceInitialRow = {
  id: string;
  full_name: string;
  student_number: string | null;
  status: AttendanceStatus | null;
  /** Jam tercatat "HH:mm" WIB. Null = belum ada record tersimpan. */
  time: string | null;
};

const STATUS_STYLES: Record<AttendanceStatus, { on: string; off: string }> = {
  hadir: {
    on: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
    off: "border-border bg-background hover:border-emerald-600/60 hover:bg-emerald-50",
  },
  terlambat: {
    on: "border-orange-500 bg-orange-500 text-white shadow-sm",
    off: "border-border bg-background hover:border-orange-500/60 hover:bg-orange-50",
  },
  izin: {
    on: "border-sky-600 bg-sky-600 text-white shadow-sm",
    off: "border-border bg-background hover:border-sky-600/60 hover:bg-sky-50",
  },
  sakit: {
    on: "border-amber-500 bg-amber-500 text-white shadow-sm",
    off: "border-border bg-background hover:border-amber-500/60 hover:bg-amber-50",
  },
  alpa: {
    on: "border-destructive bg-destructive text-white shadow-sm",
    off: "border-border bg-background hover:border-destructive/60 hover:bg-destructive/5",
  },
};

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="min-h-[48px] w-full rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Menyimpan..." : "Simpan absensi"}
    </button>
  );
}

/**
 * Form absensi: ketuk H/T/I/S/A per anak (besar, ramah jempol).
 * Yang belum ditandai = Belum Absen (null, tidak ada record).
 * Tidak ada default Hadir palsu — guru menandai yang hadir secara
 * eksplisit, atau pakai "Semua hadir" lalu koreksi yang tidak hadir.
 *
 * LIVE: halaman disegarkan otomatis tiap beberapa detik (lihat
 * SessionAutoRefresh). Data QR yang baru masuk di-merge ke baris yang
 * BELUM disentuh guru; tanda manual guru tidak pernah tertimpa.
 */
export default function AttendanceForm({
  academicYear,
  className,
  date,
  initialRows,
}: {
  academicYear: string;
  className: string;
  date: string;
  initialRows: AttendanceInitialRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, AttendanceStatus | null>>(
    () => {
      const map: Record<string, AttendanceStatus | null> = {};
      for (const r of initialRows) map[r.id] = r.status ?? null;
      return map;
    }
  );

  const [saveState, saveAction] = useFormState(saveAttendanceAction, {
    ok: false,
    error: null,
    message: null,
  });

  // ID yang sudah diketuk guru — baris ini tidak boleh tertimpa data QR
  // yang masuk belakangan (koreksi manual selalu menang).
  const touchedRef = useRef<Set<string>>(new Set());

  const lastSave = useRef(saveState);
  useEffect(() => {
    if (lastSave.current !== saveState) {
      lastSave.current = saveState;
      if (saveState.error) {
        toast.error("Absensi belum tersimpan", saveState.error);
      } else if (saveState.ok) {
        // Tersimpan = state lokal sudah sama dengan server.
        touchedRef.current.clear();
        toast.success("Absensi tersimpan", saveState.message ?? undefined);
        startTransition(() => router.refresh());
      }
    }
  });

  // Live-merge: saat data server baru tiba (refresh otomatis), adopsi
  // status ke baris yang belum disentuh guru. Baris sentuhan guru dibiarkan.
  const rowsSignature = JSON.stringify(
    initialRows.map((r) => [r.id, r.status ?? "", r.time ?? ""])
  );
  const prevSignature = useRef(rowsSignature);
  useEffect(() => {
    if (prevSignature.current === rowsSignature) return;
    prevSignature.current = rowsSignature;
    setState((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const r of initialRows) {
        if (touchedRef.current.has(r.id)) continue;
        const serverStatus = r.status ?? null;
        if ((next[r.id] ?? null) !== serverStatus) {
          next[r.id] = serverStatus;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rowsSignature, initialRows]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> & { belum: number } = {
      hadir: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
      belum: 0,
    };
    for (const r of initialRows) {
      const s = state[r.id] ?? null;
      if (s === null) c.belum++;
      else c[s]++;
    }
    return c;
  }, [initialRows, state]);

  function markAllHadir() {
    const map: Record<string, AttendanceStatus | null> = {};
    for (const r of initialRows) {
      map[r.id] = "hadir";
      touchedRef.current.add(r.id);
    }
    setState(map);
  }

  function resetMarks() {
    const map: Record<string, AttendanceStatus | null> = {};
    for (const r of initialRows) map[r.id] = r.status ?? null;
    // Kembali sama dengan data tersimpan → boleh ikut live-update lagi.
    touchedRef.current.clear();
    setState(map);
  }

  // Hanya yang ditandai dikirim — null (Belum Absen) = tidak ada record.
  const itemsJson = JSON.stringify(
    initialRows
      .map((r) => ({ studentId: r.id, status: state[r.id] ?? null }))
      .filter(
        (it): it is { studentId: string; status: AttendanceStatus } =>
          it.status !== null
      )
  );
  const markedCount = initialRows.filter((r) => (state[r.id] ?? null) !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={markAllHadir}
          className="inline-flex min-h-[48px] items-center rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
        >
          Semua hadir
        </button>
        <button
          type="button"
          onClick={resetMarks}
          title="Kembalikan ke data tersimpan"
          className="inline-flex min-h-[48px] items-center rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Reset
        </button>
        <div className="flex flex-wrap gap-2 text-sm font-semibold" role="status" aria-label="Rekap absensi">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
            H: {counts.hadir}
          </span>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">
            T: {counts.terlambat}
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">
            I: {counts.izin}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
            S: {counts.sakit}
          </span>
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
            A: {counts.alpa}
          </span>
          {counts.belum > 0 && (
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
              Belum: {counts.belum}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Daftar memantau otomatis: absensi QR yang baru masuk langsung tampil tanpa
          menekan apa pun. Tanda yang sudah Anda ketuk tidak akan tertimpa.
        </p>
      </div>

      <ol className="grid gap-3 lg:grid-cols-2">
        {initialRows.map((row, index) => {
          const current = state[row.id] ?? null;
          return (
            <li
              key={row.id}
              className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
            >
              <p className="text-[15px] font-semibold leading-snug">
                <span className="mr-1.5 text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                {row.full_name}
                {row.student_number && (
                  <span className="tnum ml-2 text-sm font-normal text-muted-foreground">
                    {row.student_number}
                  </span>
                )}
                {row.time && (
                  <span
                    title="Jam tercatat (waktu server)"
                    className="tnum ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800"
                  >
                    {row.time}
                  </span>
                )}
              </p>
              {current === null && (
                <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  Belum absen — ketuk salah satu status
                </p>
              )}
              <div
                role="group"
                aria-label={`Kehadiran ${row.full_name}`}
                className="mt-3 grid grid-cols-5 gap-2"
              >
                {ATTENDANCE_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={current === s}
                    aria-label={`${ATTENDANCE_LABELS[s]} — ${row.full_name}`}
                    onClick={() => {
                      touchedRef.current.add(row.id);
                      setState((prev) => ({
                        ...prev,
                        [row.id]: prev[row.id] === s ? null : s,
                      }));
                    }}
                    className={cn(
                      "flex min-h-[56px] flex-col items-center justify-center rounded-lg border-2 transition-colors",
                      current === s ? STATUS_STYLES[s].on : STATUS_STYLES[s].off
                    )}
                  >
                    <span className="text-xl font-bold leading-none">
                      {ATTENDANCE_SHORT[s]}
                    </span>
                    <span className="mt-0.5 text-xs font-semibold">
                      {ATTENDANCE_LABELS[s]}
                    </span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <form
        action={saveAction}
        className="sticky bottom-3 rounded-xl border bg-card/95 px-5 py-4 shadow-lg backdrop-blur"
      >
        <input type="hidden" name="academicYear" value={academicYear} />
        <input type="hidden" name="className" value={className} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="itemsJson" value={itemsJson} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="tnum flex-1 text-sm text-muted-foreground">
            {initialRows.length} siswa • {markedCount} ditandai • {counts.hadir}{" "}
            H • {counts.terlambat} T • {counts.izin} I • {counts.sakit} S •{" "}
            {counts.alpa} A
            {counts.belum > 0 && ` • ${counts.belum} belum`}
          </p>
          <SaveButton disabled={markedCount === 0} />
        </div>
      </form>
    </div>
  );
}
