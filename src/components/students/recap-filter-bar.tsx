"use client";

import { useRouter } from "next/navigation";

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

export type RecapQuickClass = { name: string; label: string };

/**
 * Filter Rekap Absensi: bulan + kelas. Setiap perubahan langsung
 * diterapkan. Nilai "__semua__" = ringkasan semua kelas.
 */
export default function RecapFilterBar({
  month,
  classValue,
  allClasses,
  quick,
  allLabel,
}: {
  month: string;
  classValue: string;
  allClasses: string[];
  quick: RecapQuickClass[];
  allLabel?: string;
}) {
  const router = useRouter();

  function go(nextMonth: string, nextClass: string) {
    const params = new URLSearchParams();
    params.set("bulan", nextMonth);
    params.set("kelas", nextClass);
    router.replace(`/students/absensi/rekap?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="rk-bulan" className="text-[15px] font-semibold">
            Bulan
          </label>
          <input
            id="rk-bulan"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) go(e.target.value, classValue);
            }}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rk-kelas" className="text-[15px] font-semibold">
            Kelas
          </label>
          <select
            id="rk-kelas"
            value={classValue}
            onChange={(e) => go(month, e.target.value)}
            className={inputClass}
          >
            <option value="__semua__">
              {allLabel ?? "Semua kelas (ringkasan sekolah)"}
            </option>
            {allClasses.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      {quick.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Jalan pintas:</span>
          {quick.map((q) => (
            <button
              key={q.name}
              type="button"
              onClick={() => go(month, q.name)}
              className="inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 font-semibold transition-colors hover:bg-muted"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
