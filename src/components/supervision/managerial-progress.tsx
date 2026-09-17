import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/common";
import {
  SCORE_LABELS,
  type ManagerialInstrumentStatus,
} from "@/lib/supervision-managerial";
import type { Database } from "@/types/database";

type ManagerialItem =
  Database["public"]["Tables"]["supervision_managerial_items"]["Row"];

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "info"> = {
  belum: "neutral",
  draft: "warning",
  selesai: "info",
  final: "success",
};

const STATUS_LABELS: Record<string, string> = {
  belum: "Belum Diisi",
  draft: "Draft",
  selesai: "Selesai",
  final: "Final",
};

export type StepState = "belum" | "draft" | "selesai" | "final";

function stepOf(
  status: ManagerialInstrumentStatus | null,
  answered: number,
  total: number
): StepState {
  if (!status && answered === 0) return "belum";
  if (status === "final") return "final";
  if (answered >= total) return "selesai";
  return "draft";
}

/**
 * Indikator progress Instrumen 1 → Instrumen 2 → Instrumen 3 → Hasil.
 */
export default function ManagerialProgress({
  i1Status,
  i1Answered,
  i2Status,
  i2Answered,
  i3Status,
  i3Answered,
  overallFinal,
}: {
  i1Status: ManagerialInstrumentStatus | null;
  i1Answered: number;
  i2Status: ManagerialInstrumentStatus | null;
  i2Answered: number;
  i3Status: ManagerialInstrumentStatus | null;
  i3Answered: number;
  overallFinal: boolean;
}) {
  const steps: { label: string; sub: string; state: StepState; href: string }[] = [
    {
      label: "Instrumen 1",
      sub: `Administrasi Kelas (${i1Answered}/13)`,
      state: stepOf(i1Status, i1Answered, 13),
      href: "#instrumen-1",
    },
    {
      label: "Instrumen 2",
      sub: `Perencanaan (${i2Answered}/10)`,
      state: stepOf(i2Status, i2Answered, 10),
      href: "#instrumen-2",
    },
    {
      label: "Instrumen 3",
      sub: `ATP/Silabus (${i3Answered}/11)`,
      state: stepOf(i3Status, i3Answered, 11),
      href: "#instrumen-3",
    },
    {
      label: "Hasil",
      sub: overallFinal ? "Final" : "Review & finalisasi",
      state: overallFinal ? "final" : "belum",
      href: "#hasil",
    },
  ];

  return (
    <ol className="grid gap-3 rounded-xl border bg-card p-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:grid-cols-4">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2.5">
          <a
            href={step.href}
            aria-label={`${step.label}: ${step.sub}, status ${STATUS_LABELS[step.state]}. Ketuk untuk menuju bagian tersebut.`}
            className="flex min-h-[44px] items-start gap-2.5 rounded-lg px-1 py-1 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            {step.state === "final" ? (
              <CheckCircle2
                className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : step.state === "draft" || step.state === "selesai" ? (
              <LoaderCircle
                className="mt-0.5 h-6 w-6 shrink-0 text-amber-600"
                aria-hidden
              />
            ) : (
              <Circle
                className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
            <div>
              <p className="text-[15px] font-semibold">{step.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.sub}</p>
              <p className="mt-1">
                <Badge tone={STATUS_TONES[step.state]}>
                  {step.state === "final"
                    ? "Sudah selesai"
                    : STATUS_LABELS[step.state]}
                </Badge>
              </p>
            </div>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Label skor 1–4 sesuai PDF. */
export function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  const label = SCORE_LABELS[score];
  return label ? `${score} — ${label}` : String(score);
}

export function itemsOf(items: ManagerialItem[], instrument: string) {
  return items.filter((i) => i.instrument === instrument);
}
