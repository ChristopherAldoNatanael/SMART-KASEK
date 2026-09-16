"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Download, FileCheck2, FileX2 } from "lucide-react";
import {
  finalizeInstrumentAction,
  saveInstrumentDraftAction,
} from "@/app/(shell)/supervision/actions";
import {
  calcInstrumentValue,
  gradeForValue,
  INSTRUMENT_ASPECTS,
  INSTRUMENT_MAX_SCORE,
  type InstrumentStatus,
} from "@/lib/supervision-instrument";
import type { SupervisionDocType } from "@/lib/supervision-docs";
import { Badge } from "@/components/common";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

export type InstrumentDocInfo = {
  doc_type: string;
  original_name: string;
  downloadUrl: string | null;
};

export type InstrumentInitialItem = {
  present: boolean;
  score: number | null;
  note: string;
};

type AspectState = InstrumentInitialItem;

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const GRADE_TONES: Record<string, "success" | "info" | "warning" | "danger"> = {
  "Amat Baik": "success",
  Baik: "info",
  Cukup: "warning",
  Kurang: "danger",
};

function DraftButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan Draft"}
    </button>
  );
}

function FinalizeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            "Selesaikan penilaian? Semua 12 aspek wajib memiliki skor 1–4."
          )
        ) {
          e.preventDefault();
        }
      }}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Memproses..." : "Selesaikan Penilaian"}
    </button>
  );
}

/**
 * Form penilaian instrumen 12 aspek (Kepala Sekolah), satu halaman:
 * tiap aspek berdampingan dengan dokumen terkait, toggle Ada/Tidak,
 * skor 1–4, catatan, dan bar ringkasan realtime (jumlah/nilai/kategori).
 * Draft tersimpan di database sehingga aman dari refresh.
 */
export default function SupervisionInstrumentForm({
  supervisionId,
  teacherName,
  dateLabel,
  teacherClassFallback,
  initialStatus,
  initialClassName,
  initialEvaluation,
  initialItems,
  docs,
}: {
  supervisionId: string;
  teacherName: string;
  dateLabel: string;
  teacherClassFallback: string | null;
  initialStatus: InstrumentStatus | null;
  initialClassName: string | null;
  initialEvaluation: string | null;
  initialItems: Partial<Record<SupervisionDocType, InstrumentInitialItem>>;
  docs: InstrumentDocInfo[];
}) {
  const router = useRouter();
  const [draftState, draftAction] = useFormState(saveInstrumentDraftAction, {
    ok: false,
    error: null,
  });
  const [finalState, finalizeAction] = useFormState(finalizeInstrumentAction, {
    ok: false,
    error: null,
  });
  const [, startTransition] = useTransition();

  const [className, setClassName] = useState(
    initialClassName ?? teacherClassFallback ?? ""
  );
  const [evaluation, setEvaluation] = useState(initialEvaluation ?? "");
  const [aspects, setAspects] = useState<Record<string, AspectState>>(() => {
    const map: Record<string, AspectState> = {};
    for (const a of INSTRUMENT_ASPECTS) {
      const prev = initialItems[a.docType];
      map[a.docType] = {
        present: prev?.present ?? false,
        score: prev?.score ?? null,
        note: prev?.note ?? "",
      };
    }
    return map;
  });

  const docsByType = useMemo(() => {
    const map = new Map<string, InstrumentDocInfo>();
    for (const d of docs) map.set(d.doc_type, d);
    return map;
  }, [docs]);

  const total = useMemo(
    () =>
      INSTRUMENT_ASPECTS.reduce(
        (sum, a) => sum + (aspects[a.docType]?.score ?? 0),
        0
      ),
    [aspects]
  );
  const value = calcInstrumentValue(total);
  const grade = gradeForValue(value);
  const unrated = INSTRUMENT_ASPECTS.filter(
    (a) => aspects[a.docType]?.score == null
  );

  // Hasil simpan/final → pop-up toast (jelas bagi pengguna non-teknis),
  // lalu muat ulang data server. Ref mencegah toast ganda.
  const lastDraft = useRef(draftState);
  const lastFinal = useRef(finalState);
  useEffect(() => {
    if (lastDraft.current !== draftState) {
      lastDraft.current = draftState;
      if (draftState.error) {
        toast.error("Gagal menyimpan draft", draftState.error);
      } else if (draftState.ok) {
        toast.success(
          "Draft tersimpan",
          "Aman. Anda dapat menutup halaman dan melanjutkan kapan saja."
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
          "Penilaian selesai",
          `Nilai ${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${grade}). Terima kasih.`
        );
        startTransition(() => router.refresh());
      }
    }
  });

  function setAspect(docType: string, patch: Partial<AspectState>) {
    setAspects((prev) => ({ ...prev, [docType]: { ...prev[docType], ...patch } }));
  }

  const itemsJson = JSON.stringify(
    INSTRUMENT_ASPECTS.map((a) => {
      const s = aspects[a.docType];
      return {
        docType: a.docType,
        present: s.present,
        score: s.score,
        ...(s.note.trim() ? { note: s.note.trim() } : {}),
      };
    })
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nama Guru
          </p>
          <p className="mt-0.5 font-semibold">{teacherName}</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="instrument-class" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Kelas
          </label>
          <input
            id="instrument-class"
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            maxLength={50}
            placeholder={teacherClassFallback ?? "mis. VII-A"}
            className={inputClass}
          />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hari / Tanggal
          </p>
          <p className="mt-0.5 font-semibold">{dateLabel}</p>
        </div>
      </div>

      {initialStatus === "final" && (
        <p className="rounded-md border border-amber-600/25 bg-amber-50 p-3 text-sm text-amber-800">
          Penilaian ini sudah final. Menyimpan draft akan mengembalikannya ke
          status draft hingga diselesaikan ulang.
        </p>
      )}

      <ol className="grid gap-3 lg:grid-cols-2">
        {INSTRUMENT_ASPECTS.map((aspect, index) => {
          const state = aspects[aspect.docType];
          const doc = docsByType.get(aspect.docType);
          return (
            <li
              key={aspect.docType}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
                state.score == null ? "border-dashed" : "border-emerald-600/25"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug">
                  <span className="mr-1.5 text-xs font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  {aspect.label}
                </p>
                {doc ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                    <FileCheck2 className="h-3 w-3" aria-hidden />
                    Dokumen ada
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border">
                    <FileX2 className="h-3 w-3" aria-hidden />
                    Belum ada
                  </span>
                )}
              </div>

              {doc?.downloadUrl && (
                <a
                  href={doc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  <Download className="h-3 w-3" aria-hidden />
                  <span className="max-w-56 truncate" title={doc.original_name}>
                    {doc.original_name}
                  </span>
                </a>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label={`Keberadaan ${aspect.label}`}
                  className="inline-flex overflow-hidden rounded-md border text-xs font-medium"
                >
                  {[
                    { value: true, label: "Ada" },
                    { value: false, label: "Tidak" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      aria-pressed={state.present === opt.value}
                      onClick={() =>
                        setAspect(aspect.docType, { present: opt.value })
                      }
                      className={cn(
                        "px-3 py-1.5 transition-colors",
                        state.present === opt.value
                          ? opt.value
                            ? "bg-emerald-600 text-white"
                            : "bg-muted-foreground text-white"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div
                  role="group"
                  aria-label={`Skor ${aspect.label} 1 sampai 4`}
                  className="inline-flex items-center gap-1"
                >
                  <span className="mr-1 text-xs text-muted-foreground">Skor</span>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={state.score === n}
                      aria-label={`Skor ${n} untuk ${aspect.label}`}
                      onClick={() =>
                        setAspect(aspect.docType, {
                          score: state.score === n ? null : n,
                        })
                      }
                      className={cn(
                        "tnum h-8 w-8 rounded-md border text-sm font-bold transition-colors",
                        state.score === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <label
                htmlFor={`note-${aspect.docType}`}
                className="mt-3 text-xs font-medium text-muted-foreground"
              >
                Catatan
              </label>
              <textarea
                id={`note-${aspect.docType}`}
                value={state.note}
                onChange={(e) =>
                  setAspect(aspect.docType, { note: e.target.value })
                }
                rows={2}
                maxLength={2000}
                placeholder="Catatan penilaian..."
                className={cn(inputClass, "mt-1")}
              />
            </li>
          );
        })}
      </ol>

      <div className="space-y-2">
        <label htmlFor="instrument-evaluation" className="text-sm font-medium">
          Evaluasi / Tindak Lanjut
        </label>
        <textarea
          id="instrument-evaluation"
          value={evaluation}
          onChange={(e) => setEvaluation(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Hasil evaluasi, temuan supervisi, hal yang perlu diperbaiki, tindak lanjut, rekomendasi..."
          className={inputClass}
        />
      </div>

      <div className="sticky bottom-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border bg-card/95 px-5 py-4 shadow-lg backdrop-blur">
        <div>
          <p className="text-xs text-muted-foreground">Jumlah Skor</p>
          <p className="tnum text-xl font-bold">
            {total}
            <span className="text-sm font-medium text-muted-foreground">
              /{INSTRUMENT_MAX_SCORE}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nilai</p>
          <p className="tnum text-xl font-bold">
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
        {unrated.length > 0 && (
          <p className="text-xs text-amber-700">
            Belum dinilai: {unrated.map((a) => a.label).join(", ")}
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <form action={draftAction}>
            <input type="hidden" name="supervisionId" value={supervisionId} />
            <input type="hidden" name="className" value={className} />
            <input type="hidden" name="evaluation" value={evaluation} />
            <input type="hidden" name="itemsJson" value={itemsJson} />
            <DraftButton disabled={false} />
          </form>
          <form action={finalizeAction}>
            <input type="hidden" name="supervisionId" value={supervisionId} />
            <input type="hidden" name="className" value={className} />
            <input type="hidden" name="evaluation" value={evaluation} />
            <input type="hidden" name="itemsJson" value={itemsJson} />
            <FinalizeButton />
          </form>
        </div>
      </div>

    </div>
  );
}
