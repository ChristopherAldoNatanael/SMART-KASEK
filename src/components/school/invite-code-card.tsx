"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { regenerateInviteCodeAction } from "@/app/(shell)/dashboard/invite-actions";
import { toast } from "@/components/toaster";

export default function InviteCodeCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  const [regenPending, startRegen] = useTransition();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API tidak tersedia (mis. HTTP non-lokal) —
      // pengguna tetap bisa menyalin manual dari teks.
    }
  }

  function handleRegenerate() {
    if (regenPending) return;
    const sure = window.confirm(
      "Buat kode undangan baru? Kode lama langsung tidak berlaku. Guru yang sudah bergabung tidak terpengaruh."
    );
    if (!sure) return;
    startRegen(async () => {
      const res = await regenerateInviteCodeAction();
      if (!res.ok) {
        toast.error("Belum berhasil", res.error ?? "Gagal membuat kode baru");
        return;
      }
      toast.success("Kode baru aktif", res.message ?? undefined);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
          <KeyRound className="h-4 w-4 text-brand" aria-hidden />
        </span>
        <h3 className="font-semibold leading-tight">Kode Undangan</h3>
      </div>
      {code ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Bagikan kepada guru agar mereka bisa bergabung dari halaman
            penyiapan akun.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code
              className="tnum flex-1 rounded-md bg-muted px-3 py-2 text-center text-lg font-bold tracking-[0.18em]"
              aria-label={`Kode undangan: ${code}`}
            >
              {code}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:border-brand/50 hover:text-brand"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenPending}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:pointer-events-none disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${regenPending ? "animate-spin" : ""}`}
                aria-hidden
              />
              {regenPending ? "Membuat kode baru..." : "Buat kode baru"}
            </button>
            <p className="text-xs text-muted-foreground">
              Bila kode bocor, buat baru — kode lama langsung mati.
            </p>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Kode belum tersedia — pastikan migrasi{" "}
          <code className="rounded bg-muted px-1 text-xs">
            00003_onboarding.sql
          </code>{" "}
          sudah dijalankan di database.
        </p>
      )}
    </section>
  );
}
