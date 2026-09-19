"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Batas error global — menggantikan halaman 500 bawaan Next.js.
 * Menampilkan pesan ramah + tombol coba lagi (reset segment).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Terjadi gangguan sesaat
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Data Anda aman — ini masalah teknis, bukan masalah akun Anda.
            Periksa koneksi internet, lalu coba lagi.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
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
        <p className="text-xs text-muted-foreground">
          SMART KASEK • Bila terus berulang, hubungi operator sekolah
        </p>
      </div>
    </main>
  );
}
