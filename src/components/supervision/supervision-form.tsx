"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createSupervisionAction } from "@/app/(shell)/supervision/actions";

export type TeacherOption = { id: string; name: string };

type ItemRow = {
  indicator: string;
  category: string;
  score: string;
  observation: string;
  recommendation: string;
};

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
      {pending ? "Menyimpan..." : "Simpan Supervisi"}
    </button>
  );
}

const EMPTY_ROW: ItemRow = {
  indicator: "",
  category: "",
  score: "",
  observation: "",
  recommendation: "",
};

export default function SupervisionForm({
  teachers,
  defaultDate,
}: {
  teachers: TeacherOption[];
  defaultDate: string;
}) {
  const [state, formAction] = useFormState(createSupervisionAction, {
    ok: false,
    error: null,
  });
  const [rows, setRows] = useState<ItemRow[]>([]);

  function addRow() {
    if (rows.length >= 30) return;
    setRows([...rows, { ...EMPTY_ROW }]);
  }

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.indicator.trim().length > 0)
      .map((r) => {
        const scoreNum = r.score.trim() === "" ? undefined : Number(r.score);
        return {
          indicator: r.indicator.trim(),
          ...(r.category.trim() ? { category: r.category.trim() } : {}),
          ...(scoreNum !== undefined && !Number.isNaN(scoreNum)
            ? { score: scoreNum }
            : {}),
          ...(r.observation.trim()
            ? { observation: r.observation.trim() }
            : {}),
          ...(r.recommendation.trim()
            ? { recommendation: r.recommendation.trim() }
            : {}),
        };
      })
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
          <select id="teacherId" name="teacherId" required className={inputClass}>
            <option value="">Pilih guru</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="supervisionDate" className="text-sm font-medium">
            Tanggal Supervisi <span className="text-destructive">*</span>
          </label>
          <input
            id="supervisionDate"
            name="supervisionDate"
            type="date"
            required
            defaultValue={defaultDate}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Tipe Supervisi
          </label>
          <input
            id="type"
            name="type"
            type="text"
            maxLength={100}
            placeholder="mis. Supervisi kelas"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue="draft" className={inputClass}>
            <option value="draft">Draft</option>
            <option value="completed">Selesai</option>
            <option value="follow_up">Tindak Lanjut</option>
            <option value="closed">Ditutup</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-medium">
            Ringkasan
          </label>
          <textarea id="summary" name="summary" rows={3} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="strengths" className="text-sm font-medium">
            Kekuatan
          </label>
          <textarea id="strengths" name="strengths" rows={3} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="improvements" className="text-sm font-medium">
            Perlu Ditingkatkan
          </label>
          <textarea
            id="improvements"
            name="improvements"
            rows={3}
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Indikator Penilaian</h2>
            <p className="text-xs text-muted-foreground">
              Skor 0–100. Skor keseluruhan dihitung otomatis dari rata-rata
              indikator terisi.
            </p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            + Tambah Indikator
          </button>
        </div>

        <input type="hidden" name="itemsJson" value={itemsJson} />

        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada indikator. Supervisi tetap bisa disimpan sebagai draft
            tanpa indikator.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {rows.map((row, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Indikator #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={`Hapus indikator ${i + 1}`}
                    className="rounded-md border px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Hapus
                  </button>
                </div>
                <input
                  type="text"
                  value={row.indicator}
                  onChange={(e) => updateRow(i, { indicator: e.target.value })}
                  placeholder="Indikator yang dinilai"
                  maxLength={500}
                  aria-label={`Indikator ${i + 1}`}
                  className={inputClass}
                />
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    type="text"
                    value={row.category}
                    onChange={(e) => updateRow(i, { category: e.target.value })}
                    placeholder="Kategori (opsional)"
                    maxLength={100}
                    aria-label={`Kategori indikator ${i + 1}`}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={row.score}
                    onChange={(e) => updateRow(i, { score: e.target.value })}
                    placeholder="Skor 0–100"
                    min={0}
                    max={100}
                    aria-label={`Skor indikator ${i + 1}`}
                    className={`${inputClass} md:w-40`}
                  />
                </div>
                <input
                  type="text"
                  value={row.observation}
                  onChange={(e) => updateRow(i, { observation: e.target.value })}
                  placeholder="Observasi (opsional)"
                  maxLength={2000}
                  aria-label={`Observasi indikator ${i + 1}`}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={row.recommendation}
                  onChange={(e) =>
                    updateRow(i, { recommendation: e.target.value })
                  }
                  placeholder="Rekomendasi (opsional)"
                  maxLength={2000}
                  aria-label={`Rekomendasi indikator ${i + 1}`}
                  className={inputClass}
                />
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
