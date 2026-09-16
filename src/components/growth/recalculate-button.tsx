"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import {
  recalculateAllAction,
} from "@/app/(shell)/growth/actions";
import { toast } from "@/components/toaster";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
        aria-hidden
      />
      {pending ? "Menghitung…" : "Hitung Ulang"}
    </button>
  );
}

/**
 * Tombol hitung ulang snapshot growth seluruh sekolah.
 * Hasil sukses/gagal muncul sebagai toast, lalu data dimuat ulang.
 */
export function RecalculateGrowthButton() {
  const [state, formAction] = useFormState(recalculateAllAction, {
    ok: false,
    error: null,
    message: null,
  });
  const router = useRouter();
  const [, startTransition] = useTransition();
  const last = useRef(state);

  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Gagal menghitung ulang", state.error);
      } else if (state.ok) {
        toast.success("Snapshot diperbarui", state.message ?? "Selesai.");
        startTransition(() => router.refresh());
      }
    }
  });

  return (
    <form action={formAction}>
      <SubmitButton />
    </form>
  );
}
