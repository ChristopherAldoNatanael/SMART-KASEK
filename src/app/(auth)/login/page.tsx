"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { login } from "@/lib/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    const result = await login(undefined, formData);
    if (result?.error) {
      setError(result.error);
    }
    setIsPending(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 shadow-sm">
            <GraduationCap className="h-6 w-6 text-white" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight">SMART KASEK</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk mengelola sekolah Anda
          </p>
        </div>

        <form
          action={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="email@sekolah.id"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Memproses…" : "Masuk"}
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Akun dibuat oleh Kepala Sekolah • Minta kode undangan bila belum
          terhubung
        </p>
      </div>
    </main>
  );
}
