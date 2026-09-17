"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dialog konfirmasi ramah dalam aplikasi — pengganti window.confirm()
 * yang menakutkan bagi pengguna non-IT.
 *
 * Bahasa sederhana, tombol besar (min. 48px), dan tombol aman ("Periksa
 * lagi") yang jadi fokus awal agar tidak terpencet tanpa sengaja.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              danger ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand"
            )}
          >
            {danger ? (
              <AlertTriangle className="h-6 w-6" aria-hidden />
            ) : (
              <HelpCircle className="h-6 w-6" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-snug">{title}</p>
            <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[48px] rounded-lg border px-4 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "min-h-[48px] rounded-lg px-4 py-3 text-[15px] font-semibold text-white transition-colors disabled:opacity-50",
              danger
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {busy ? "Tunggu sebentar..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

