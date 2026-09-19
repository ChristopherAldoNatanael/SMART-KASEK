"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { analyzeSchoolAction } from "@/app/(shell)/dashboard/actions";
import type { SchoolInsight } from "@/services/ai.service";
import { Badge } from "@/components/common";
import { toast } from "@/components/toaster";

export type CachedSchoolInsight = {
  generatedAt: string;
  insight: SchoolInsight;
} | null;

function AnalyzeButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      <Sparkles className="h-5 w-5" aria-hidden />
      {pending ? "Menganalisis..." : label}
    </button>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * AI School Insight di dashboard: 1 tombol, hasil Ringkasan /
 * Perhatian / Saran + catatan kecil. Tidak otomatis dipanggil —
 * hanya saat Kepala Sekolah menekan tombol.
 */
export default function AISchoolInsight({
  initial,
}: {
  initial: CachedSchoolInsight;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(analyzeSchoolAction, {
    ok: false,
    error: null,
    data: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Analisis belum berhasil", state.error);
      } else if (state.ok && state.data) {
        toast.success(
          state.cached ? "Menampilkan hasil tersimpan" : "Analisis selesai",
          state.cached
            ? "Kondisi belum berubah sejak analisis terakhir."
            : "Hasil dirangkum dari data sekolah saat ini."
        );
        router.refresh();
      }
    }
  });

  const shown = state.ok && state.data ? state.data : initial?.insight ?? null;

  return (
    <div className="space-y-4">
      {!shown && (
        <div className="rounded-xl border border-dashed p-5 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-brand" aria-hidden />
          <p className="mt-2 text-[15px] font-semibold">
            Minta ringkasan kondisi sekolah
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            AI membaca angka ringkasan (bukan nama orang) lalu menunjukkan hal
            yang perlu diperhatikan beserta sarannya.
          </p>
          <form action={formAction} className="mt-4">
            <AnalyzeButton label="Analisis Kondisi Sekolah" />
          </form>
        </div>
      )}

      {shown && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold">Ringkasan Kondisi</h4>
            <p className="mt-1 text-[15px] leading-relaxed">{shown.summary}</p>
          </div>
          {shown.attention.length > 0 && (
            <div>
              <h4 className="text-sm font-bold">Perlu Diperhatikan</h4>
              <ul className="mt-1.5 space-y-1.5">
                {shown.attention.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed">
                    <span className="tnum mt-0.5 shrink-0 font-bold text-brand">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shown.actions.length > 0 && (
            <div>
              <h4 className="text-sm font-bold">Saran Tindakan</h4>
              <ul className="mt-1.5 space-y-1.5">
                {shown.actions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed">
                    <span className="tnum mt-0.5 shrink-0 font-bold text-brand">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {initial?.generatedAt && (
              <Badge tone="neutral">
                Dianalisis {formatDate(initial.generatedAt)}
              </Badge>
            )}
            <form action={formAction} className="ml-auto">
              <input type="hidden" name="refresh" value="true" />
              <AnalyzeButton label="Analisis ulang" />
            </form>
          </div>
          <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            AI memberikan saran berdasarkan data yang tersedia. Periksa kembali
            hasil sebelum digunakan sebagai dasar tindak lanjut.
          </p>
        </div>
      )}
    </div>
  );
}
