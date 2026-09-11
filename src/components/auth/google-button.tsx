"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tombol OAuth Google (login & register memakai alur yang sama —
 * akun baru otomatis masuk onboarding pilih peran).
 */
export default function GoogleButton({
  mode = "login",
  next = "/onboarding",
}: {
  mode?: "login" | "register";
  next?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setError(
          "Konfigurasi aplikasi belum lengkap di server. Hubungi administrator sistem."
        );
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError("Gagal menghubungi Google. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.7 3.5 2.7.2.1c2.2-2 3.6-5 3.6-9.5z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-3c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.2-7-5.1l-.7.1-2.7 2.1-.1.6C3.5 21.3 7.4 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2l-.1-.7-2.7-2.1-.1.1C.7 8.7 0 10.2 0 12s.7 3.3 2 4.9l3-2.7z"
          />
          <path
            fill="#EA4335"
            d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1 15.2 0 12 0 7.4 0 3.5 2.7 1.4 7.1l3.6 2.7c1-2.9 3.8-5.1 7-5.1z"
          />
        </svg>
        {pending
          ? "Menghubungkan…"
          : mode === "register"
            ? "Daftar dengan Google"
            : "Masuk dengan Google"}
      </button>
      {error && (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
