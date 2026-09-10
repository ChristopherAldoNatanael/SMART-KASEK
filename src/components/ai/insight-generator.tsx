"use client";

import { useState } from "react";
import { CircleAlert, Sparkles } from "lucide-react";
import { generateSchoolInsight } from "@/services/ai.service";
import type { ValidatedAIOutput } from "@/lib/ai/validators";
import { Badge } from "@/components/common";

export default function InsightGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidatedAIOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generateSchoolInsight();

    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error ?? "Terjadi kesalahan");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {loading ? "Menganalisis…" : "Buat Insight Baru"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg bg-muted/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="leading-relaxed">{result.summary}</p>
            <Badge
              tone={
                result.priority === "critical" || result.priority === "high"
                  ? "danger"
                  : result.priority === "medium"
                    ? "warning"
                    : "success"
              }
            >
              {result.priority.toUpperCase()}
            </Badge>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {result.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kekuatan
                </p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {result.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.areas.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Area Prioritas
                </p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {result.areas.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {result.recommendations.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rekomendasi Program
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {result.recommendations.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Bahan pertimbangan — perlu verifikasi Kepala Sekolah. Insight ini
            tersimpan otomatis di riwayat.
          </p>
        </div>
      )}
    </div>
  );
}
