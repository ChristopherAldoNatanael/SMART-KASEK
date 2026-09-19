"use client";

import { useRouter } from "next/navigation";

/** Pilih tahun pelajaran — langsung pindah saat diganti. */
export default function YearSelect({
  years,
  active,
  base,
}: {
  years: string[];
  active: string;
  base: string;
}) {
  const router = useRouter();

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <label htmlFor="pk-tahun" className="font-semibold">
        Tahun Pelajaran
      </label>
      <select
        id="pk-tahun"
        value={active}
        onChange={(e) => router.replace(`${base}?tahun=${encodeURIComponent(e.target.value)}`)}
        className="min-h-[44px] rounded-lg border bg-background px-3 text-[15px]"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </span>
  );
}
