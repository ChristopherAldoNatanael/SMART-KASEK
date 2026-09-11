"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveCompetencyAction } from "@/app/(shell)/teachers/actions";

export type CompetencyOption = {
  id: string;
  name: string;
  category: string;
  latestScore: number | null;
};

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SOURCE_LABELS: Record<string, string> = {
  supervision: "Supervisi",
  self_assessment: "Penilaian Diri",
  coaching: "Coaching",
  assessment: "Asesmen",
  manual: "Manual",
  ai: "AI",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan…" : "Simpan Nilai"}
    </button>
  );
}

export default function CompetencyForm({
  teacherId,
  competencies,
}: {
  teacherId: string;
  competencies: CompetencyOption[];
}) {
  const [state, formAction] = useFormState(saveCompetencyAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="teacherId" value={teacherId} />
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}
      {state.ok && (
        <div
          role="status"
          className="rounded-md bg-emerald-700/10 p-3 text-sm text-emerald-800"
        >
          Nilai tersimpan — profil perkembangan diperbarui.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_150px]">
        <div className="space-y-1.5">
          <label htmlFor="competencyId" className="text-xs font-medium text-muted-foreground">
            Kompetensi
          </label>
          <select id="competencyId" name="competencyId" required className={inputClass}>
            <option value="">Pilih…</option>
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.latestScore ?? "—"})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="score" className="text-xs font-medium text-muted-foreground">
            Skor 0–100
          </label>
          <input
            id="score"
            name="score"
            type="number"
            required
            min={0}
            max={100}
            placeholder="80"
            className={`${inputClass} tnum`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="source" className="text-xs font-medium text-muted-foreground">
            Sumber
          </label>
          <select id="source" name="source" defaultValue="manual" className={inputClass}>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <SubmitButton />
    </form>
  );
}
