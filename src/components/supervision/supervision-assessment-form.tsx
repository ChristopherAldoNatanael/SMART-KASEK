"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import {
  deleteSupervisionItemAction,
  saveSupervisionAssessmentAction,
} from "@/app/(shell)/supervision/actions";

type ItemRow = {
  indicator: string;
  category: string;
  score: string;
  observation: string;
  recommendation: string;
};

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const EMPTY_ROW: ItemRow = {
  indicator: "",
  category: "",
  score: "",
  observation: "",
  recommendation: "",
};

function SubmitButton({ hasRows }: { hasRows: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !hasRows}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan Penilaian"}
    </button>
  );
}

/**
 * Form penilaian susulan (Kepala Sekolah) di halaman detail.
 * Dipakai setelah guru melengkapi dokumen: tambah indikator 0–100
 * + perbarui ringkasan/kekuatan/perlu ditingkatkan.
 */
export default function SupervisionAssessmentForm({
  supervisionId,
  initialSummary,
  initialStrengths,
  initialImprovements,
  docsComplete,
  docsCount,
}: {
  supervisionId: string;
  initialSummary: string | null;
  initialStrengths: string | null;
  initialImprovements: string | null;
  docsComplete: boolean;
  docsCount: number;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(saveSupervisionAssessmentAction, {
    ok: false,
    error: null,
  });
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [, startTransition] = useTransition();

  // Segarkan data server (daftar indikator + skor) setelah berhasil simpan.
  useEffect(() => {
    if (state.ok) {
      setRows([]);
      startTransition(() => router.refresh());
    }
  }, [state.ok, router]);

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

  const hasRows = rows.some((r) => r.indicator.trim().length > 0);

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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="supervisionId" value={supervisionId} />
      <input type="hidden" name="itemsJson" value={itemsJson} />

      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}
      {state.ok && (
        <div
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700"
        >
          Penilaian tersimpan. Skor keseluruhan dihitung ulang otomatis.
        </div>
      )}

      {!docsComplete && (
        <p className="rounded-md border border-amber-600/25 bg-amber-50 p-3 text-sm text-amber-800">
          Dokumen guru belum lengkap ({docsCount}/12). Sebaiknya tunggu
          dilengkapi dulu — tetapi penilaian tetap bisa disimpan bila mendesak.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="assessment-summary" className="text-sm font-medium">
            Ringkasan
          </label>
          <textarea
            id="assessment-summary"
            name="summary"
            rows={3}
            maxLength={5000}
            defaultValue={initialSummary ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="assessment-strengths" className="text-sm font-medium">
            Kekuatan
          </label>
          <textarea
            id="assessment-strengths"
            name="strengths"
            rows={3}
            maxLength={5000}
            defaultValue={initialStrengths ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="assessment-improvements"
            className="text-sm font-medium"
          >
            Perlu Ditingkatkan
          </label>
          <textarea
            id="assessment-improvements"
            name="improvements"
            rows={3}
            maxLength={5000}
            defaultValue={initialImprovements ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Tambah Indikator</h4>
            <p className="text-xs text-muted-foreground">
              Skor 0–100. Skor keseluruhan = rata-rata seluruh indikator.
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

        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada indikator baru. Indikator yang sudah tersimpan tampil di
            daftar bawah dan bisa dihapus satu per satu.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {rows.map((row, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Indikator baru #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={`Hapus indikator baru ${i + 1}`}
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
                  aria-label={`Indikator baru ${i + 1}`}
                  className={inputClass}
                />
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    type="text"
                    value={row.category}
                    onChange={(e) => updateRow(i, { category: e.target.value })}
                    placeholder="Kategori (opsional)"
                    maxLength={100}
                    aria-label={`Kategori indikator baru ${i + 1}`}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={row.score}
                    onChange={(e) => updateRow(i, { score: e.target.value })}
                    placeholder="Skor 0–100"
                    min={0}
                    max={100}
                    aria-label={`Skor indikator baru ${i + 1}`}
                    className={`${inputClass} md:w-40`}
                  />
                </div>
                <input
                  type="text"
                  value={row.observation}
                  onChange={(e) => updateRow(i, { observation: e.target.value })}
                  placeholder="Observasi (opsional)"
                  maxLength={2000}
                  aria-label={`Observasi indikator baru ${i + 1}`}
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
                  aria-label={`Rekomendasi indikator baru ${i + 1}`}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <SubmitButton hasRows={hasRows} />
    </form>
  );
}

/**
 * Tombol hapus satu indikator tersimpan (Kepala Sekolah).
 */
export function SupervisionItemDeleteButton({
  itemId,
  supervisionId,
  label,
}: {
  itemId: string;
  supervisionId: string;
  label: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm(`Hapus indikator "${label}"?`)) return;
    setError(null);
    setDeleting(true);
    try {
      const data = new FormData();
      data.set("itemId", itemId);
      data.set("supervisionId", supervisionId);
      const result = await deleteSupervisionItemAction(
        { ok: false, error: null },
        data
      );
      if (!result.ok) throw new Error(result.error ?? "Gagal menghapus");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting || isPending}
        aria-label={`Hapus indikator ${label}`}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
      >
        {deleting ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3 w-3" aria-hidden />
        )}
        Hapus
      </button>
    </span>
  );
}
