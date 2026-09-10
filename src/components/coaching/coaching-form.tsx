"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createSessionAction } from "@/app/(shell)/coaching/actions";

export type TeacherOption = { id: string; name: string };
export type SupervisionOption = { id: string; label: string };

type ActionRow = { action: string; targetDate: string };

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan Sesi"}
    </button>
  );
}

export default function CoachingForm({
  teachers,
  supervisions,
  defaultDate,
  defaultTeacherId,
  defaultSupervisionId,
}: {
  teachers: TeacherOption[];
  supervisions: SupervisionOption[];
  defaultDate: string;
  defaultTeacherId?: string;
  defaultSupervisionId?: string;
}) {
  const [state, formAction] = useFormState(createSessionAction, {
    ok: false,
    error: null,
  });
  const [rows, setRows] = useState<ActionRow[]>([]);

  function addRow() {
    if (rows.length >= 20) return;
    setRows([...rows, { action: "", targetDate: "" }]);
  }

  function updateRow(index: number, patch: Partial<ActionRow>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  const actionsJson = JSON.stringify(
    rows
      .filter((r) => r.action.trim().length > 0)
      .map((r) => ({
        action: r.action.trim(),
        ...(r.targetDate ? { targetDate: r.targetDate } : {}),
      }))
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="teacherId" className="text-sm font-medium">
            Guru <span className="text-destructive">*</span>
          </label>
          <select
            id="teacherId"
            name="teacherId"
            required
            defaultValue={defaultTeacherId ?? ""}
            className={inputClass}
          >
            <option value="">Pilih guru</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="sessionDate" className="text-sm font-medium">
            Tanggal Sesi <span className="text-destructive">*</span>
          </label>
          <input
            id="sessionDate"
            name="sessionDate"
            type="date"
            required
            defaultValue={defaultDate}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="focusArea" className="text-sm font-medium">
            Fokus Area
          </label>
          <input
            id="focusArea"
            name="focusArea"
            type="text"
            maxLength={200}
            placeholder="mis. Asesmen formatif"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue="scheduled" className={inputClass}>
            <option value="scheduled">Terjadwal</option>
            <option value="in_progress">Berlangsung</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="supervisionId" className="text-sm font-medium">
          Supervisi Terkait (opsional)
        </label>
        <select
          id="supervisionId"
          name="supervisionId"
          defaultValue={defaultSupervisionId ?? ""}
          className={inputClass}
        >
          <option value="">Tanpa supervisi terkait</option>
          {supervisions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Menghubungkan coaching dengan temuan supervisi memperkuat alur
          Supervisi → Coaching → Tindak Lanjut.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="initialCondition" className="text-sm font-medium">
            Kondisi Awal
          </label>
          <textarea
            id="initialCondition"
            name="initialCondition"
            rows={3}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="discussion" className="text-sm font-medium">
            Diskusi
          </label>
          <textarea id="discussion" name="discussion" rows={3} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="agreement" className="text-sm font-medium">
            Kesepakatan
          </label>
          <textarea id="agreement" name="agreement" rows={3} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-medium">
            Ringkasan
          </label>
          <textarea id="summary" name="summary" rows={3} className={inputClass} />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Tindak Lanjut Awal (opsional)
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            + Tambah Tindakan
          </button>
        </div>

        <input type="hidden" name="actionsJson" value={actionsJson} />

        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada tindakan. Tindak lanjut juga bisa ditambahkan dari halaman
            detail sesi.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 md:flex-row">
                <input
                  type="text"
                  value={row.action}
                  onChange={(e) => updateRow(i, { action: e.target.value })}
                  placeholder={`Tindakan ${i + 1}`}
                  maxLength={500}
                  aria-label={`Tindakan ${i + 1}`}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={row.targetDate}
                  onChange={(e) => updateRow(i, { targetDate: e.target.value })}
                  aria-label={`Target tanggal tindakan ${i + 1}`}
                  className={`${inputClass} md:w-48`}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={`Hapus tindakan ${i + 1}`}
                  className="rounded-md border px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
