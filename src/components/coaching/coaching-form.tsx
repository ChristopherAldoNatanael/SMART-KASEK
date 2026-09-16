"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createSessionAction } from "@/app/(shell)/coaching/actions";
import { ChevronDown, ChevronUp } from "lucide-react";

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

function Section({
  title,
  step,
  defaultOpen = false,
  children,
}: {
  title: string;
  step?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {step !== undefined && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {step}
            </span>
          )}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="border-t p-4">{children}</div>}
    </div>
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
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <Section title="1. Informasi Dasar" step={1} defaultOpen={true}>
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
            <select
              id="status"
              name="status"
              defaultValue="scheduled"
              className={inputClass}
            >
              <option value="scheduled">Terjadwal</option>
              <option value="in_progress">Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="2. Supervisi Terkait" step={2}>
        <div className="space-y-2">
          <label htmlFor="supervisionId" className="text-sm font-medium">
            Hubungkan dengan Supervisi
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
      </Section>

      <Section title="3. Catatan Sesi" step={3}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="initialCondition" className="text-sm font-medium">
              Kondisi Awal
            </label>
            <textarea
              id="initialCondition"
              name="initialCondition"
              rows={3}
              placeholder="Kondisi/guru saat ini terkait fokus area"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="discussion" className="text-sm font-medium">
              Diskusi
            </label>
            <textarea
              id="discussion"
              name="discussion"
              rows={3}
              placeholder="Poin-poin diskusi selama sesi"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="agreement" className="text-sm font-medium">
              Kesepakatan
            </label>
            <textarea
              id="agreement"
              name="agreement"
              rows={3}
              placeholder="Kesepakatan antara coach dan guru"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="summary" className="text-sm font-medium">
              Ringkasan
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={3}
              placeholder="Ringkasan keseluruhan sesi"
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      <Section title="4. Tindak Lanjut Awal" step={4}>
        <input type="hidden" name="actionsJson" value={actionsJson} />

        <p className="mb-3 text-sm text-muted-foreground">
          Tindak lanjut yang disepakati bersama guru. Bisa juga ditambahkan
          kemudian dari halaman detail.
        </p>

        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada tindakan. Klik tombol di bawah untuk menambah.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 md:flex-row md:items-center"
              >
                <div className="flex-1 space-y-2 md:flex md:gap-2 md:space-y-0">
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
                    className={`${inputClass} md:w-44`}
                  />
                </div>
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

        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          + Tambah Tindakan
        </button>
      </Section>

      <div className="flex gap-2 pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
