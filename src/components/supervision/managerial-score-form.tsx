"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  finalizeManagerialInstrumentAction,
  saveManagerialI1Action,
  saveManagerialI3Action,
} from "@/app/(shell)/supervision/manajerial/actions";
import {
  managerialGradeForValue,
  SCORE_LABELS,
  type ManagerialInstrumentStatus,
} from "@/lib/supervision-managerial";
import { Badge } from "@/components/common";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

export type ManagerialScoreDef = {
  key: string;
  label: string;
  detail?: string;
};

export type ManagerialScoreInitial = {
  score: number | null;
  note: string;
};

// text-base di HP agar layar tidak otomatis zoom saat mengetik.
const inputClass =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

const GRADE_TONES: Record<string, "success" | "info" | "warning" | "danger"> = {
  "Amat Baik": "success",
  Baik: "info",
  Cukup: "warning",
  Kurang: "danger",
};

const SCORE_HINTS: Record<number, string> = {
  1: "Belum Terlihat",
  2: "Mulai Terlihat",
  3: "Berkembang",
  4: "Membudaya / Sangat Baik",
};

function DraftButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Simpan sementara — aman, bisa dilanjutkan kapan saja"
      className="min-h-[48px] rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan dulu"}
    </button>
  );
}

function FinalizeButton({
  totalCount,
  answeredCount,
  instrumentLabel,
}: {
  totalCount: number;
  answeredCount: number;
  instrumentLabel: string;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const remaining = totalCount - answeredCount;

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          formRef.current = e.currentTarget.form;
          if (remaining > 0) {
            toast.error(
              "Belum bisa diselesaikan",
              `Masih ada ${remaining} dari ${totalCount} komponen yang belum dinilai. Silakan lengkapi terlebih dahulu.`
            );
            return;
          }
          setOpen(true);
        }}
        className="min-h-[48px] rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? "Memproses..." : "Selesaikan instrumen"}
      </button>
      <ConfirmDialog
        open={open}
        title={`Selesaikan ${instrumentLabel}`}
        description={`Seluruh ${totalCount} komponen telah dinilai.\n\nSetelah diselesaikan, instrumen berstatus final dan hasilnya dapat dilihat oleh guru yang bersangkutan.`}
        confirmLabel="Selesaikan"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}

/**
 * Form skor 1–4 untuk Instrumen 1 (13 komponen) dan Instrumen 3 (11 komponen).
 * Pilihan berupa label PDF (bukan angka saja) + catatan per komponen.
 */
export default function ManagerialScoreForm({
  supervisionId,
  instrument,
  items,
  max,
  initialStatus,
  initialItems,
}: {
  supervisionId: string;
  instrument: "i1" | "i3";
  items: ManagerialScoreDef[];
  max: number;
  initialStatus: ManagerialInstrumentStatus | null;
  initialItems: Record<string, ManagerialScoreInitial>;
}) {
  const router = useRouter();
  const saveAction = instrument === "i1" ? saveManagerialI1Action : saveManagerialI3Action;
  const [draftState, draftAction] = useFormState(saveAction, {
    ok: false,
    error: null,
  });
  const [finalState, finalizeAction] = useFormState(
    finalizeManagerialInstrumentAction,
    { ok: false, error: null }
  );
  const [, startTransition] = useTransition();

  const [state, setState] = useState<Record<string, ManagerialScoreInitial>>(() => {
    const map: Record<string, ManagerialScoreInitial> = {};
    for (const item of items) {
      const prev = initialItems[item.key];
      map[item.key] = { score: prev?.score ?? null, note: prev?.note ?? "" };
    }
    return map;
  });

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (state[i.key]?.score ?? 0), 0),
    [items, state]
  );
  const value = Math.round((total / max) * 100 * 100) / 100;
  const grade = managerialGradeForValue(value);
  const unrated = items.filter((i) => state[i.key]?.score == null);

  const lastDraft = useRef(draftState);
  const lastFinal = useRef(finalState);
  useEffect(() => {
    if (lastDraft.current !== draftState) {
      lastDraft.current = draftState;
      if (draftState.error) {
        toast.error("Belum berhasil menyimpan", draftState.error);
      } else if (draftState.ok) {
        toast.success(
          "Sudah tersimpan aman",
          "Halaman ini bisa ditutup dan dilanjutkan kapan saja. Tidak ada data yang hilang."
        );
        startTransition(() => router.refresh());
      }
    }
    if (lastFinal.current !== finalState) {
      lastFinal.current = finalState;
      if (finalState.error) {
        toast.error("Belum bisa diselesaikan", finalState.error);
      } else if (finalState.ok) {
        toast.success(
          "Bagus, instrumen selesai",
          `Nilai ${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (kategori ${grade}). Terima kasih.`
        );
        startTransition(() => router.refresh());
      }
    }
  });

  function setScore(key: string, score: number | null) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], score } }));
  }

  function setNote(key: string, note: string) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], note } }));
  }

  const itemsJson = JSON.stringify(
    items.map((i) => ({
      key: i.key,
      score: state[i.key]?.score ?? null,
      ...(state[i.key]?.note.trim() ? { note: state[i.key].note.trim() } : {}),
    }))
  );

  const answeredCount = items.length - unrated.length;
  const progressPct =
    items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {initialStatus === "final" && (
        <p className="rounded-lg border border-amber-600/25 bg-amber-50 p-4 text-[15px] text-amber-800">
          Instrumen ini sudah selesai (final). Jika ada perubahan lalu
          menekan “Simpan dulu”, statusnya kembali menjadi draft sampai
          diselesaikan ulang.
        </p>
      )}

      <div className="rounded-xl border border-sky-600/20 bg-sky-50 p-4 text-[15px] text-sky-900">
        <p className="font-bold">Cara mengisi:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
          <li>
            Ketuk salah satu pilihan <strong>1 sampai 4</strong> untuk setiap
            komponen di bawah.
          </li>
          <li>
            Catatan <strong>boleh dikosongkan</strong> — isi hanya jika ada
            temuan.
          </li>
          <li>
            Belum selesai? Ketuk <strong>“Simpan dulu”</strong> — data aman dan
            bisa dilanjutkan kapan saja.
          </li>
        </ol>
      </div>

      <div
        className="rounded-xl border bg-card p-4"
        role="status"
        aria-label={`Sudah dinilai ${answeredCount} dari ${items.length} komponen`}
      >
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <p className="font-semibold">
            Sudah dinilai: {answeredCount} dari {items.length}
          </p>
          <p className="tnum font-bold">{progressPct}%</p>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progressPct >= 100 ? "bg-emerald-500" : "bg-brand"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {unrated.length > 0 ? (
          <p className="mt-2 text-sm text-amber-700">
            Masih ada {unrated.length} komponen yang belum dinilai.
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-emerald-700">
            Semua komponen sudah dinilai — silakan tekan “Sudah lengkap?
            Selesaikan” di bawah.
          </p>
        )}
      </div>

      <ol className="grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => {
          const s = state[item.key];
          return (
            <li
              key={item.key}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
                s.score == null ? "border-dashed" : "border-emerald-600/25"
              )}
            >
              <p className="text-[15px] font-semibold leading-snug">
                <span className="mr-1.5 text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                {item.label}
                {s.score == null ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">
                    Belum dinilai
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-xs font-semibold text-emerald-800">
                    Sudah dinilai
                  </span>
                )}
              </p>
              {item.detail && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              )}

              <div
                role="radiogroup"
                aria-label={`Nilai untuk: ${item.label}`}
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={s.score === n}
                    aria-label={`Nilai ${n}: ${SCORE_HINTS[n]}`}
                    onClick={() => setScore(item.key, s.score === n ? null : n)}
                    className={cn(
                      "flex min-h-[52px] items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left transition-colors",
                      s.score === n
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base font-bold",
                        s.score === n ? "bg-white/25" : "bg-muted"
                      )}
                    >
                      {n}
                    </span>
                    <span className="text-sm font-semibold leading-tight">
                      {SCORE_HINTS[n]}
                    </span>
                  </button>
                ))}
              </div>

              <details className="mt-3 rounded-lg border border-dashed px-3 py-2">
                <summary className="cursor-pointer py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                  {s.note.trim()
                    ? "Lihat / ubah catatan"
                    : "Tambah catatan (tidak wajib)"}
                </summary>
                <textarea
                  aria-label={`Catatan untuk: ${item.label}`}
                  value={s.note}
                  onChange={(e) => setNote(item.key, e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Contoh: papan data belum ada hasil karya siswa..."
                  className={cn(inputClass, "mt-2")}
                />
              </details>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-3 rounded-xl border bg-card/95 px-5 py-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Perkiraan nilai</p>
            <p className="tnum text-2xl font-bold">
              {value.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kategori</p>
            <div className="mt-0.5">
              <Badge tone={GRADE_TONES[grade]}>{grade}</Badge>
            </div>
          </div>
          <p className="tnum text-sm text-muted-foreground">
            Jumlah skor {total}/{max}
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <form action={draftAction} className="grid sm:block">
            <input type="hidden" name="supervisionId" value={supervisionId} />
            <input type="hidden" name="itemsJson" value={itemsJson} />
            <DraftButton />
          </form>
          <form action={finalizeAction} className="grid sm:block">
            <input type="hidden" name="supervisionId" value={supervisionId} />
            <input type="hidden" name="instrument" value={instrument} />
            <input type="hidden" name="itemsJson" value={itemsJson} />
            <FinalizeButton
              totalCount={items.length}
              answeredCount={answeredCount}
              instrumentLabel={instrument === "i1" ? "Instrumen 1" : "Instrumen 3"}
            />
          </form>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Arti angka 1–4:</p>
        <ul className="mt-1 space-y-0.5">
          <li><strong>1</strong> = {SCORE_LABELS[1]}</li>
          <li><strong>2</strong> = {SCORE_LABELS[2]}</li>
          <li><strong>3</strong> = {SCORE_LABELS[3]}</li>
          <li><strong>4</strong> = {SCORE_LABELS[4]}</li>
        </ul>
      </div>
    </div>
  );
}
