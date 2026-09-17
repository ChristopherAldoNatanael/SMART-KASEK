"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  finalizeManagerialInstrumentAction,
  saveManagerialI2Action,
} from "@/app/(shell)/supervision/manajerial/actions";
import { MANAGERIAL_I2_ITEMS } from "@/lib/supervision-managerial";
import { Badge } from "@/components/common";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

export type ManagerialBinaryInitial = {
  present: boolean | null;
  note: string;
};

// text-base di HP agar layar tidak otomatis zoom saat mengetik.
const inputClass =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

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
  answeredCount,
  totalCount,
}: {
  answeredCount: number;
  totalCount: number;
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
              `Masih ada ${remaining} dari ${totalCount} indikator yang belum dijawab. Silakan lengkapi terlebih dahulu.`
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
        title="Selesaikan Instrumen 2"
        description={`Seluruh ${totalCount} indikator telah dijawab.\n\nSetelah diselesaikan, instrumen berstatus final dan hasilnya dapat dilihat oleh guru yang bersangkutan.`}
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
 * Form Instrumen 2: 10 indikator Ada/Tidak + catatan (sesuai PDF —
 * bukan skala 1–4).
 */
export default function ManagerialBinaryForm({
  supervisionId,
  initialStatus,
  initialItems,
}: {
  supervisionId: string;
  initialStatus: "draft" | "final" | null;
  initialItems: Record<string, ManagerialBinaryInitial>;
}) {
  const router = useRouter();
  const [draftState, draftAction] = useFormState(saveManagerialI2Action, {
    ok: false,
    error: null,
  });
  const [finalState, finalizeAction] = useFormState(
    finalizeManagerialInstrumentAction,
    { ok: false, error: null }
  );
  const [, startTransition] = useTransition();

  const [state, setState] = useState<Record<string, ManagerialBinaryInitial>>(
    () => {
      const map: Record<string, ManagerialBinaryInitial> = {};
      for (const item of MANAGERIAL_I2_ITEMS) {
        const prev = initialItems[item.key];
        map[item.key] = {
          present: prev?.present ?? null,
          note: prev?.note ?? "",
        };
      }
      return map;
    }
  );

  const answered = useMemo(
    () => MANAGERIAL_I2_ITEMS.filter((i) => state[i.key]?.present !== null).length,
    [state]
  );
  const presentCount = useMemo(
    () => MANAGERIAL_I2_ITEMS.filter((i) => state[i.key]?.present === true).length,
    [state]
  );
  const value = Math.round((presentCount / MANAGERIAL_I2_ITEMS.length) * 100 * 100) / 100;

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
          "Bapak/Ibu bisa menutup halaman ini dan melanjutkannya kapan saja. Tidak ada data yang hilang."
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
          "Bagus, Instrumen 2 selesai",
          `Ada ${presentCount} dari ${MANAGERIAL_I2_ITEMS.length} indikator (Nilai ${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Terima kasih, Bu/Pak!`
        );
        startTransition(() => router.refresh());
      }
    }
  });

  function setPresent(key: string, present: boolean) {
    setState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        present: prev[key]?.present === present ? null : present,
      },
    }));
  }

  function setNote(key: string, note: string) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], note } }));
  }

  const itemsJson = JSON.stringify(
    MANAGERIAL_I2_ITEMS.map((i) => ({
      key: i.key,
      present: state[i.key]?.present ?? null,
      ...(state[i.key]?.note.trim() ? { note: state[i.key].note.trim() } : {}),
    }))
  );

  const progressPct = Math.round((answered / MANAGERIAL_I2_ITEMS.length) * 100);

  return (
    <div className="space-y-4">
      {initialStatus === "final" && (
        <p className="rounded-lg border border-amber-600/25 bg-amber-50 p-4 text-[15px] text-amber-800">
          Instrumen ini sudah selesai (final). Kalau Bapak/Ibu mengubah lalu
          menekan “Simpan dulu”, statusnya kembali menjadi draft sampai
          diselesaikan ulang.
        </p>
      )}

      <div className="rounded-xl border border-sky-600/20 bg-sky-50 p-4 text-[15px] text-sky-900">
        <p className="font-bold">Cara mengisi — gampang, Bu/Pak:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
          <li>
            Untuk setiap pernyataan, ketuk <strong>“Ada”</strong> kalau guru
            sudah melakukannya, atau <strong>“Tidak”</strong> kalau belum.
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
        aria-label={`Sudah dijawab ${answered} dari ${MANAGERIAL_I2_ITEMS.length} indikator`}
      >
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <p className="font-semibold">
            Sudah dijawab: {answered} dari {MANAGERIAL_I2_ITEMS.length}
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
        {answered < MANAGERIAL_I2_ITEMS.length ? (
          <p className="mt-2 text-sm text-amber-700">
            Masih ada {MANAGERIAL_I2_ITEMS.length - answered} indikator yang
            belum dijawab.
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-emerald-700">
            Semua indikator sudah dijawab — silakan tekan “Sudah lengkap?
            Selesaikan” di bawah.
          </p>
        )}
      </div>

      <ol className="grid gap-3 lg:grid-cols-2">
        {MANAGERIAL_I2_ITEMS.map((item, index) => {
          const s = state[item.key];
          const done = s.present !== null;
          return (
            <li
              key={item.key}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
                done ? "border-emerald-600/25" : "border-dashed"
              )}
            >
              <p className="text-[15px] font-semibold leading-snug">
                <span className="mr-1.5 text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                {item.label}
                {done ? (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-xs font-semibold text-emerald-800">
                    Sudah dijawab
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">
                    Belum dijawab
                  </span>
                )}
              </p>

              <div
                role="group"
                aria-label={`Jawaban untuk: ${item.label}`}
                className="mt-3 grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  aria-pressed={s.present === true}
                  aria-label={`Ada — ${item.label}`}
                  onClick={() => setPresent(item.key, true)}
                  className={cn(
                    "flex min-h-[56px] items-center justify-center gap-2 rounded-lg border-2 text-base font-bold transition-colors",
                    s.present === true
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "border-border bg-background hover:border-emerald-600/60 hover:bg-emerald-50"
                  )}
                >
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Ada
                </button>
                <button
                  type="button"
                  aria-pressed={s.present === false}
                  aria-label={`Tidak — ${item.label}`}
                  onClick={() => setPresent(item.key, false)}
                  className={cn(
                    "flex min-h-[56px] items-center justify-center gap-2 rounded-lg border-2 text-base font-bold transition-colors",
                    s.present === false
                      ? "border-slate-500 bg-slate-500 text-white shadow-sm"
                      : "border-border bg-background hover:border-slate-400 hover:bg-muted/60"
                  )}
                >
                  <XCircle className="h-5 w-5" aria-hidden />
                  Tidak
                </button>
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
                  placeholder="Contoh: ATP sudah ada tapi belum berkesinambungan..."
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
            <p className="text-xs text-muted-foreground">Yang menjawab “Ada”</p>
            <div className="mt-0.5">
              <Badge tone={presentCount >= 8 ? "success" : "warning"}>
                {presentCount}/{MANAGERIAL_I2_ITEMS.length}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <form action={draftAction} className="grid sm:block">
            <input type="hidden" name="supervisionId" value={supervisionId} />
            <input type="hidden" name="itemsJson" value={itemsJson} />
            <DraftButton />
          </form>
          <form action={finalizeAction} className="grid sm:block">
            <input type="hidden" name="supervisionId" value={supervisionId} />
            <input type="hidden" name="instrument" value="i2" />
            <input type="hidden" name="itemsJson" value={itemsJson} />
            <FinalizeButton answeredCount={answered} totalCount={MANAGERIAL_I2_ITEMS.length} />
          </form>
        </div>
      </div>
    </div>
  );
}
