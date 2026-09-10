"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { generateCoachAnalysis } from "@/services/ai.service";
import type { ValidatedAIOutput } from "@/lib/ai/validators";
import { Badge, PageHeader, Panel } from "@/components/common";

interface Teacher {
  id: string;
  profile: { full_name: string | null } | null;
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function InsightRow({
  icon: Icon,
  title,
  items,
  iconClass,
}: {
  icon: typeof Lightbulb;
  title: string;
  items: string[];
  iconClass: string;
}) {
  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <ul className="mt-1 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AICoachPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidatedAIOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTeachers() {
    try {
      const response = await fetch("/api/teachers");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data);
      }
    } catch {
      setError("Gagal memuat daftar guru");
    }
  }

  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacherId) {
      setError("Pilih guru terlebih dahulu");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generateCoachAnalysis({
      teacherId: selectedTeacherId,
      question: question || undefined,
    });

    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error ?? "Terjadi kesalahan");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kecerdasan"
        title="AI Coach Guru"
        description="Analisis berbasis data supervisi, coaching, dan perkembangan — keputusan tetap di tangan Anda."
      />

      <Panel title="Pilih Guru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="teacher" className="text-sm font-medium">
                Guru
              </label>
              <select
                id="teacher"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih guru…</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.profile?.full_name ?? "Tanpa Nama"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="question" className="text-sm font-medium">
                Fokus pertanyaan <span className="font-normal text-muted-foreground">(opsional)</span>
              </label>
              <input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="mis. Bagaimana meningkatkan asesmen formatif?"
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !selectedTeacherId}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {loading ? "Menganalisis…" : "Jalankan Analisis"}
          </button>
        </form>
      </Panel>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Panel
            title="Hasil Analisis"
            action={
              <Badge
                tone={
                  result.priority === "critical"
                    ? "danger"
                    : result.priority === "high"
                      ? "warning"
                      : result.priority === "medium"
                        ? "warning"
                        : "success"
                }
              >
                Prioritas {result.priority.toUpperCase()}
              </Badge>
            }
          >
            <p className="leading-relaxed text-foreground">{result.summary}</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {result.strengths.length > 0 && (
                <InsightRow
                  icon={CheckCircle2}
                  title="Kekuatan"
                  items={result.strengths}
                  iconClass="bg-emerald-700/10 text-emerald-800"
                />
              )}
              {result.areas.length > 0 && (
                <InsightRow
                  icon={CircleAlert}
                  title="Perlu Ditingkatkan"
                  items={result.areas}
                  iconClass="bg-amber-500/10 text-amber-800"
                />
              )}
            </div>
            {result.recommendations.length > 0 && (
              <div className="mt-5 border-t pt-5">
                <InsightRow
                  icon={Lightbulb}
                  title="Rekomendasi"
                  items={result.recommendations}
                  iconClass="bg-brand/10 text-brand"
                />
              </div>
            )}
            {result.suggested_actions.length > 0 && (
              <div className="mt-5 border-t pt-5">
                <p className="text-sm font-semibold">Saran Tindak Lanjut</p>
                <ul className="mt-2 space-y-2">
                  {result.suggested_actions.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span>{a.action}</span>
                      {a.target_days != null && (
                        <span className="tnum shrink-0 text-xs text-muted-foreground">
                          {a.target_days} hari
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-600/25 bg-amber-50/60 p-4 text-sm text-amber-900">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1">
              Rekomendasi AI adalah bahan pertimbangan berdasarkan data yang
              tersedia — perlu verifikasi Kepala Sekolah sebelum ditindaklanjuti.
            </p>
            {selectedTeacherId && (
              <Link
                href={`/coaching/new?teacherId=${selectedTeacherId}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Buat Coaching
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
