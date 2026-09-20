"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** Pindah semester/tahun tanpa reload penuh (router client-side). */
export default function ProgramFilterBar({
  semester,
  academicYear,
  years,
}: {
  semester: 1 | 2;
  academicYear: string;
  years: string[];
}) {
  const router = useRouter();

  function go(s: 1 | 2, y: string) {
    const params = new URLSearchParams();
    params.set("semester", String(s));
    params.set("tahun", y);
    router.push(`/programs?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {([1, 2] as const).map((s) => (
        <Link
          key={s}
          href={`/programs?semester=${s}&tahun=${encodeURIComponent(academicYear)}`}
          aria-current={s === semester ? "page" : undefined}
          className={
            s === semester
              ? "inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              : "inline-flex min-h-[44px] items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          }
        >
          Semester {s}
        </Link>
      ))}
      <label className="ml-1 inline-flex items-center gap-2 text-sm font-medium">
        Tahun pelajaran
        <select
          value={academicYear}
          onChange={(e) => go(semester, e.target.value)}
          className="min-h-[44px] rounded-lg border bg-background px-3 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
