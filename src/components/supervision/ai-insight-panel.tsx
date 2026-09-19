"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { analyzeSupervisionAction } from "@/app/(shell)/supervision/ai-actions";
import type { SupervisionInsight } from "@/services/ai.service";
import { Badge } from "@/components/common";
import { toast } from "@/components/toaster";

export type CachedInsight = {
  cached: boolean;
  insight: SupervisionInsight;
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

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-bold">{title}</h4>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed">
            <span className="tnum mt-0.5 shrink-0 font-bold text-brand">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * AI Insight di hasil supervisi: 1 tombol, loading jelas,
 * kartu Ringkasan/Temuan/Prioritas/Saran + catatan kecil.
 * Kepala Sekolah bisa meminta analisis (baru/ulang); guru hanya
 * membaca hasil tersimpan.
 */
export default function AIInsightPanel({
  supervisionId,
  initial,
  canGenerate,
}: {
  supervisionId: string;
  initial: CachedInsight;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(analyzeSupervisionAction, {
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
            ? "Data belum berubah sejak analisis terakhir."
            : "Hasil dirangkum dari data supervisi ini."
        );
        router.refresh();
      }
    }
  });

  const shown = state.ok && state.data ? state.data : initial?.insight ?? null;
  const fromCache = state.ok && state.data ? !!state.cached : !!initial?.cached;

  return (
    <div className="space-y-4">
      {!shown && (
        <div className="rounded-xl border border-dashed p-5 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-brand" aria-hidden />
          <p className="mt-2 text-[15px] font-semibold">
            Minta ringkasan otomatis dari hasil supervisi ini
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            AI membaca skor dan catatan, lalu merangkum temuan, prioritas, dan
            saran tindak lanjut. Nilai tidak diubah.
          </p>
          {canGenerate ? (
            <form action={formAction} className="mt-4">
              <input type="hidden" name="supervisionId" value={supervisionId} />
              <AnalyzeButton label="Analisis dengan AI" />
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Kepala Sekolah dapat meminta analisis ini.
            </p>
          )}
        </div>
      )}

      {shown && (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="flex items-center gap-1.5 text-base font-bold">
              <Sparkles className="h-5 w-5 text-brand" aria-hidden />
              AI Insight
            </h4>
            {fromCache && <Badge tone="neutral">Hasil tersimpan</Badge>}
          </div>

          <div>
            <h4 className="text-sm font-bold">Ringkasan</h4>
            <p className="mt-1 text-[15px] leading-relaxed">{shown.summary}</p>
          </div>
          <Section title="Temuan Utama" items={shown.findings} />
          <Section title="Prioritas Perbaikan" items={shown.priorities} />
          <Section title="Saran Tindak Lanjut" items={shown.actions} />

          <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            AI memberikan saran berdasarkan data yang tersedia. Periksa kembali
            hasil sebelum digunakan sebagai dasar tindak lanjut.
          </p>

          {canGenerate && (
            <form action={formAction}>
              <input type="hidden" name="supervisionId" value={supervisionId} />
              <input type="hidden" name="refresh" value="true" />
              <AnalyzeButton label="Analisis ulang" />
            </form>
          )}
        </div>
      )}
    </div>
  );
}
