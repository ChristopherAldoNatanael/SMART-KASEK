"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Bot, BookmarkPlus, CheckCheck } from "lucide-react";
import {
  explainWarningAction,
  resolveWarningAction,
  saveWarningAction,
} from "@/app/(shell)/ai/early-warning/actions";
import type { WarningFinding } from "@/lib/early-warning/rules";
import type { ActiveWarning } from "@/services/warning.service";
import { Badge } from "@/components/common";

const SEVERITY_TONES: Record<string, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "warning",
  critical: "danger",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  critical: "Kritis",
};

const TYPE_LABELS: Record<string, string> = {
  low_growth: "Skor perkembangan rendah",
  declining_growth: "Perkembangan menurun",
  low_supervision_score: "Skor supervisi rendah",
  overdue_follow_up: "Tindak lanjut terlambat",
  stale_coaching: "Coaching tidak terbaru",
  critical_risk: "Risiko ganda",
};

function ActionButton({
  label,
  pendingLabel,
  icon: Icon,
}: {
  label: string;
  pendingLabel: string;
  icon: typeof Bot;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand/50 hover:text-brand disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {pending ? pendingLabel : label}
    </button>
  );
}

export function FindingCard({ finding }: { finding: WarningFinding }) {
  const [explainState, explainFormAction] = useFormState(
    explainWarningAction,
    { ok: false, error: null, data: null }
  );
  const [saveState, saveFormAction] = useFormState(saveWarningAction, {
    ok: false,
    error: null,
    data: null,
  });
  const findingJson = JSON.stringify(finding);

  return (
    <article className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{finding.teacherName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {TYPE_LABELS[finding.type] ?? finding.type}
            {finding.subject ? ` • ${finding.subject}` : ""}
          </p>
        </div>
        <Badge tone={SEVERITY_TONES[finding.severity] ?? "warning"}>
          {SEVERITY_LABELS[finding.severity] ?? finding.severity}
        </Badge>
      </div>

      <ul className="mt-3 space-y-1 border-l-2 border-muted pl-3">
        {finding.evidence.map((e, i) => (
          <li key={i} className="text-sm text-muted-foreground">
            {e}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed">
        <span className="font-semibold">Rekomendasi: </span>
        {finding.recommendation}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        <form action={explainFormAction}>
          <input type="hidden" name="findingJson" value={findingJson} />
          <ActionButton
            label="Penjelasan AI"
            pendingLabel="Meminta…"
            icon={Bot}
          />
        </form>
        <form action={saveFormAction}>
          <input type="hidden" name="findingJson" value={findingJson} />
          <ActionButton
            label={saveState.ok ? "Tersimpan" : "Pantau"}
            pendingLabel="Menyimpan…"
            icon={BookmarkPlus}
          />
        </form>
        <Link
          href={`/teachers/${finding.teacherId}`}
          className="ml-auto text-xs font-medium text-brand hover:underline"
        >
          Profil Guru
        </Link>
      </div>

      {(explainState.error || saveState.error) && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {explainState.error ?? saveState.error}
        </p>
      )}

      {explainState.ok && explainState.data && (
        <div className="mt-3 rounded-lg bg-muted/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Penjelasan AI
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            {explainState.data.summary}
          </p>
          {explainState.data.recommendations.length > 0 && (
            <ul className="mt-2 space-y-1">
              {explainState.data.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function StoredWarningCard({ warning }: { warning: ActiveWarning }) {
  const [state, formAction] = useFormState(resolveWarningAction, {
    ok: false,
    error: null,
    data: null,
  });

  return (
    <article className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{warning.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Terdeteksi{" "}
            {new Date(warning.detected_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {warning.teacherName ? ` • ${warning.teacherName}` : ""}
          </p>
        </div>
        <Badge tone={SEVERITY_TONES[warning.severity] ?? "warning"}>
          {SEVERITY_LABELS[warning.severity] ?? warning.severity}
        </Badge>
      </div>

      {warning.description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {warning.description}
        </p>
      )}
      {warning.recommendation && (
        <p className="mt-1.5 text-sm">
          <span className="font-semibold">Rekomendasi: </span>
          {warning.recommendation}
        </p>
      )}

      <form action={formAction} className="mt-3 border-t pt-3">
        <input type="hidden" name="warningId" value={warning.id} />
        <ActionButton
          label={state.ok ? "Selesai" : "Tandai Selesai"}
          pendingLabel="Menyimpan…"
          icon={CheckCheck}
        />
        {state.error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {state.error}
          </p>
        )}
      </form>
    </article>
  );
}
