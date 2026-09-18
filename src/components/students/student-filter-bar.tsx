"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const selectClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

/**
 * Bar filter Data Siswa: tahun ajaran → kelas → pencarian nama/NIS.
 * Setiap perubahan langsung diterapkan (tanpa tombol tambahan).
 */
export default function StudentFilterBar({
  years,
  classes,
  initial,
}: {
  years: string[];
  classes: string[];
  initial: { tahun: string; kelas: string; cari: string };
}) {
  const router = useRouter();
  const [cari, setCari] = useState(initial.cari);

  function go(next: { tahun: string; kelas: string; cari: string }) {
    const params = new URLSearchParams();
    params.set("tahun", next.tahun);
    if (next.kelas) params.set("kelas", next.kelas);
    if (next.cari.trim()) params.set("cari", next.cari.trim());
    router.replace(`/students?${params.toString()}`);
  }

  // Pencarian diketik → diterapkan otomatis setelah berhenti mengetik.
  useEffect(() => {
    if (cari === initial.cari) return;
    const t = setTimeout(() => {
      go({ tahun: initial.tahun, kelas: initial.kelas, cari });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cari]);

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="f-tahun" className="text-[15px] font-semibold">
          Tahun Ajaran
        </label>
        <select
          id="f-tahun"
          value={initial.tahun}
          onChange={(e) => go({ tahun: e.target.value, kelas: "", cari })}
          className={selectClass}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="f-kelas" className="text-[15px] font-semibold">
          Kelas
        </label>
        <select
          id="f-kelas"
          value={initial.kelas}
          onChange={(e) => go({ tahun: initial.tahun, kelas: e.target.value, cari })}
          className={selectClass}
        >
          <option value="">Semua kelas</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              Kelas {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="f-cari" className="text-[15px] font-semibold">
          Cari nama / NIS
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="f-cari"
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Ketik nama atau NIS..."
            maxLength={100}
            className={`${selectClass} pl-10`}
          />
        </div>
      </div>
    </div>
  );
}
