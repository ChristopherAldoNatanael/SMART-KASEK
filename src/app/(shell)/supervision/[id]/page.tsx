import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupervisionById } from "@/services/supervision.service";
import SupervisionStatusForm from "@/components/supervision/supervision-status-form";
import { Badge, PageHeader, Panel } from "@/components/common";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  completed: "Selesai",
  follow_up: "Tindak Lanjut",
  closed: "Ditutup",
};

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "info"> = {
  draft: "neutral",
  completed: "success",
  follow_up: "warning",
  closed: "info",
};

export default async function SupervisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supervision = await getSupervisionById(id);
  if (!supervision) {
    notFound();
  }

  const date = new Date(supervision.supervision_date).toLocaleDateString(
    "id-ID",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-6">
      <Link
        href="/supervision"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Supervisi
      </Link>

      <PageHeader
        eyebrow={`Supervisi • ${date}`}
        title={supervision.teacher?.profile?.full_name ?? "Tanpa nama"}
        description={`Tipe: ${supervision.type ?? "—"} • Supervisor: ${supervision.supervisor?.full_name ?? "—"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONES[supervision.status] ?? "neutral"}>
              {STATUS_LABELS[supervision.status] ?? supervision.status}
            </Badge>
            <Link
              href={`/coaching/new?teacherId=${supervision.teacher_id}&supervisionId=${supervision.id}`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Buat Coaching
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Skor Keseluruhan">
          <p className="tnum text-4xl font-bold tracking-tight">
            {supervision.overall_score ?? "—"}
          </p>
        </Panel>
        <Panel title="Indikator Dinilai">
          <p className="tnum text-4xl font-bold tracking-tight">
            {supervision.items?.length ?? 0}
          </p>
        </Panel>
        <Panel title="Status">
          <SupervisionStatusForm
            supervisionId={supervision.id}
            current={supervision.status}
          />
        </Panel>
      </div>

      {(supervision.summary || supervision.strengths || supervision.improvements) && (
        <div className="grid gap-4 md:grid-cols-3">
          {supervision.summary && (
            <Panel title="Ringkasan">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {supervision.summary}
              </p>
            </Panel>
          )}
          {supervision.strengths && (
            <Panel title="Kekuatan">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {supervision.strengths}
              </p>
            </Panel>
          )}
          {supervision.improvements && (
            <Panel title="Perlu Ditingkatkan">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {supervision.improvements}
              </p>
            </Panel>
          )}
        </div>
      )}

      <Panel
        title="Indikator Supervisi"
        description="Setiap indikator dinilai 0–100 beserta observasi dan rekomendasi"
      >
        {supervision.items && supervision.items.length > 0 ? (
          <ul className="divide-y">
            {supervision.items.map((item, index) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      #{index + 1}
                      {item.category ? ` • ${item.category}` : ""}
                    </p>
                    <p className="mt-1 font-medium leading-snug">
                      {item.indicator}
                    </p>
                    {item.observation && (
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Observasi:{" "}
                        </span>
                        {item.observation}
                      </p>
                    )}
                    {item.recommendation && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Rekomendasi:{" "}
                        </span>
                        {item.recommendation}
                      </p>
                    )}
                  </div>
                  <span className="tnum shrink-0 text-xl font-bold">
                    {item.score ?? "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada indikator supervisi.
          </p>
        )}
      </Panel>
    </div>
  );
}
