"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";

type ToastItem = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function push(tone: ToastTone, title: string, description?: string) {
  const id = nextId++;
  items = [...items.slice(-2), { id, tone, title, description }];
  emit();
  // Error tampil lebih lama agar sempat dibaca.
  const timeout = tone === "error" ? 8000 : 5000;
  setTimeout(() => dismiss(id), timeout);
}

function dismiss(id: number) {
  const before = items.length;
  items = items.filter((t) => t.id !== id);
  if (items.length !== before) emit();
}

/**
 * API notifikasi pop-up global — tanpa provider, cukup panggil:
 *   toast.success("Draft tersimpan", "Isi pesan lanjutan (opsional).")
 *   toast.error("Gagal menyimpan", "Alasan.")
 * Teks dibuat besar dan kontras untuk pengguna non-teknis.
 */
export const toast = {
  success(title: string, description?: string) {
    push("success", title, description);
  },
  error(title: string, description?: string) {
    push("error", title, description);
  },
};

/**
 * Wadah pop-up. Pasang sekali di AppShell.
 */
export function Toaster() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-card p-4 shadow-xl",
            item.tone === "success" && "border-l-4 border-l-emerald-500",
            item.tone === "error" && "border-l-4 border-l-destructive"
          )}
        >
          {item.tone === "success" ? (
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
              aria-hidden
            />
          ) : (
            <AlertTriangle
              className="mt-0.5 h-6 w-6 shrink-0 text-destructive"
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-snug">{item.title}</p>
            {item.description && (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Tutup pemberitahuan"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
