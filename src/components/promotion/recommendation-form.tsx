"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  saveRecommendationAction,
  submitClassAction,
} from "@/app/(shell)/kenaikan-kelas/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  PROMOTION_RECOMMENDATION_LABELS,
  type PromotionRecommendation,
} from "@/lib/promotion";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

const OPTIONS: { value: PromotionRecommendation; hint: string }[] = [
  { value: "naik", hint: "Siswa siap lanjut ke kelas berikutnya" },
  { value: "tidak_naik", hint: "Siswa perlu mengulang di kelas ini" },
  { value: "pertimbangan", hint: "Belum bisa diputuskan, perlu dibahas" },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[48px] w-full rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Menyimpan..." : "Simpan rekomendasi"}
    </button>
  );
}

/**
 * Form rekomendasi wali kelas: 3 pilihan besar + catatan.
 * Catatan wajib untuk Tidak Naik / Perlu Pertimbangan.
 */
export function RecommendationForm({
  studentId,
  studentName,
  academicYear,
  initialRecommendation,
  initialNote,
}: {
  studentId: string;
  studentName: string;
  academicYear: string;
  initialRecommendation: PromotionRecommendation | null;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [choice, setChoice] = useState<PromotionRecommendation | null>(
    initialRecommendation
  );
  const [note, setNote] = useState(initialNote ?? "");
  const [state, formAction] = useFormState(saveRecommendationAction, {
    ok: false,
    error: null,
    message: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success(
          "Rekomendasi tersimpan",
          state.message ?? `Rekomendasi untuk ${studentName} aman tersimpan sebagai draft.`
        );
        startTransition(() => router.refresh());
      }
    }
  });

  const noteRequired = choice === "tidak_naik" || choice === "pertimbangan";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="academicYear" value={academicYear} />
      <div role="radiogroup" aria-label="Rekomendasi kenaikan kelas" className="grid gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={choice === opt.value}
            onClick={() => setChoice(choice === opt.value ? null : opt.value)}
            className={cn(
              "flex min-h-[56px] items-center gap-3 rounded-lg border-2 px-4 py-2.5 text-left transition-colors",
              choice === opt.value
                ? "border-primary bg-primary/[0.06] shadow-sm"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                choice === opt.value ? "border-primary" : "border-muted-foreground"
              )}
              aria-hidden
            >
              {choice === opt.value && (
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </span>
            <span>
              <span className="block text-[15px] font-bold">
                {PROMOTION_RECOMMENDATION_LABELS[opt.value]}
              </span>
              <span className="block text-sm text-muted-foreground">{opt.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <input type="hidden" name="recommendation" value={choice ?? ""} />

      <div className="space-y-1.5">
        <label htmlFor="rec-note" className="text-[15px] font-semibold">
          Catatan wali kelas{" "}
          {noteRequired ? (
            <span className="text-destructive">* wajib diisi</span>
          ) : (
            <span className="font-normal text-muted-foreground">(opsional)</span>
          )}
        </label>
        <textarea
          id="rec-note"
          name="note"
          rows={4}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: berdasarkan rekap hasil belajar dan kehadiran selama tahun berjalan..."
          className={inputClass}
        />
      </div>

      <SaveButton />
    </form>
  );
}

function SubmitTrigger({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending || count === 0}
      onClick={onOpen}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Mengirim..." : `Kirim ${count} rekomendasi ke Kepala Sekolah`}
    </button>
  );
}

/** Bilah kirim rekomendasi kelas (wali) dengan konfirmasi ramah. */
export function SubmitClassBar({
  academicYear,
  className,
  reviewed,
  total,
}: {
  academicYear: string;
  className: string;
  reviewed: number;
  total: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(submitClassAction, {
    ok: false,
    error: null,
    message: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil mengirim", state.error);
      } else if (state.ok) {
        toast.success("Terkirim", state.message ?? undefined);
        startTransition(() => router.refresh());
      }
    }
  });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-5 py-4">
      <p className="tnum flex-1 text-[15px]" role="status">
        Sudah direkomendasikan: <strong>{reviewed}</strong> dari{" "}
        <strong>{total}</strong> siswa
      </p>
      <form action={formAction} ref={formRef}>
        <input type="hidden" name="academicYear" value={academicYear} />
        <input type="hidden" name="className" value={className} />
        <SubmitTrigger count={reviewed} onOpen={() => setOpen(true)} />
      </form>
      <ConfirmDialog
        open={open}
        title="Kirim ke Kepala Sekolah"
        description={`${reviewed} rekomendasi Kelas ${className} akan dikirim untuk diverifikasi. Setelah dikirim, rekomendasi tidak bisa diubah sampai Kepala Sekolah mengembalikannya.`}
        confirmLabel="Kirim"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
