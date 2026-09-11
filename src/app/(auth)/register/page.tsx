"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { signup } from "@/lib/auth/actions";
import GoogleButton from "@/components/auth/google-button";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [role, setRole] = useState<"teacher" | "principal">("teacher");

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    const result = await signup(undefined, formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.needsConfirmation) {
      setNeedsConfirmation(true);
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
          <h1 className="mt-4 text-xl font-bold tracking-tight">
            Daftar SMART KASEK
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat akun untuk mulai mengelola sekolah
          </p>
        </div>

        {needsConfirmation ? (
          <div className="rounded-xl border bg-card p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <p className="font-semibold">Periksa email Anda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Klik tautan konfirmasi yang dikirim, lalu Anda akan diarahkan
              memilih peran dan bergabung ke sekolah.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
            >
              Ke Halaman Masuk
            </Link>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <GoogleButton mode="register" />

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              atau daftar dengan email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Saya adalah</span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "teacher", label: "Guru" },
                      { value: "principal", label: "Kepala Sekolah" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      aria-pressed={role === opt.value}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        role === opt.value
                          ? "border-brand bg-brand/10 text-brand"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="role" value={role} />
              </div>

              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nama Lengkap
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Nama Anda"
                  className={inputClass}
                />
              </div>

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
                  placeholder="email@sekolah.id"
                  className={inputClass}
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
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  className={inputClass}
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
                {isPending ? "Memproses…" : "Daftar"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-brand hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
