"use client";

import { useRouter } from "next/navigation";
import { todayISO, todayWIB } from "@/lib/students";

function shift(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/**
 * Pindah tanggal absensi: kemarin / hari ini / tanggal bebas.
 * Tombol "besok" tidak ada karena absensi hari esok tidak bisa diisi.
 */
export default function AttendanceDateNav({
  academicYear,
  className,
  current,
}: {
  academicYear: string;
  className: string;
  current: string;
}) {
  const router = useRouter();
  // Patokan hari = WIB (Asia/Jakarta), bukan timezone HP/server.
  // HP guru yang timezone-nya salah tetap dapat batas yang benar.
  const today = todayWIB();

  function go(date: string) {
    const params = new URLSearchParams();
    params.set("tahun", academicYear);
    params.set("kelas", className);
    params.set("tanggal", date);
    router.replace(`/students/absensi?${params.toString()}`);
  }

  const btn =
    "inline-flex min-h-[48px] items-center justify-center rounded-lg border px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => go(shift(current, -1))} className={btn}>
        ‹ Kemarin
      </button>
      <button
        type="button"
        onClick={() => go(today)}
        disabled={current === today}
        className={btn}
      >
        Hari ini
      </button>
      <input
        type="date"
        aria-label="Pilih tanggal absensi"
        value={current}
        max={today}
        onChange={(e) => {
          if (e.target.value) go(e.target.value);
        }}
        className="min-h-[48px] rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      />
    </div>
  );
}
