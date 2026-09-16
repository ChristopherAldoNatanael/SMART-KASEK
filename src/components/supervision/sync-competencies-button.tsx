"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { syncSupervisionCompetenciesAction } from "@/app/(shell)/supervision/actions";
import { toast } from "@/components/toaster";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      <Send className="h-3.5 w-3.5" aria-hidden />
      {pending ? "Mengirim…" : "Kirim ke Profil Guru"}
    </button>
  );
}

/**
 * Kirim (ulang) skor instrumen final ke Kompetensi Terkini +
 * Profil Perkembangan guru. Untuk supervisi yang diselesaikan
 * sebelum pengiriman otomatis ada, atau bila pengiriman otomatis
 * gagal diam-diam (mis. master kompetensi belum tersedia saat itu).
 */
export function SyncCompetenciesButton({
  supervisionId,
}: {
  supervisionId: string;
}) {
  const [state, formAction] = useFormState(
    syncSupervisionCompetenciesAction,
    { ok: false, error: null, message: null }
  );
  const router = useRouter();
  const [, startTransition] = useTransition();
  const last = useRef(state);

  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Gagal mengirim", state.error);
      } else if (state.ok) {
        toast.success("Terkirim ke profil guru", state.message ?? "Selesai.");
        startTransition(() => router.refresh());
      }
    }
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="supervisionId" value={supervisionId} />
      <SubmitButton />
    </form>
  );
}
