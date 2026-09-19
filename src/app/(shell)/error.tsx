"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Batas error area aplikasi (di dalam shell — navigasi tetap tampil).
 */
export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Shell error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-bold tracking-tight">
        Halaman ini gagal dimuat
      </h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Data Anda aman — ini masalah teknis sesaat. Periksa koneksi internet,
        lalu coba lagi.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Coba lagi
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Ke dashboard
        </Link>
      </div>
    </div>
  );
}
