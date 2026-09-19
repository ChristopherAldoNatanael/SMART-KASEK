"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { applyPromotionDecisionsAction } from "@/app/(shell)/kenaikan-kelas/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { isFinalYearClass, suggestNextClass } from "@/lib/students";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import type { ExecutionPreview } from "@/services/promotion.service";

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function ExecuteButton({
  disabled,
  onOpen,
}: {
  disabled: boolean;
  onOpen: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onOpen}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menerapkan..." : "Terapkan ke tahun tujuan"}
    </button>
  );
}

/**
 * Terapkan keputusan final ke tahun ajaran baru. Hanya aktif bila
 * SEMUA siswa sudah ditetapkan — yang Naik pindah (VI → Lulus),
 * yang Tidak Naik tetap. Aman dijalankan ulang (duplikat dilewati).
 */
export default function ApplyDecisionsPanel({
  preview,
}: {
  preview: ExecutionPreview;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [targetYear, setTargetYear] = useState(preview.targetYearDefault);
  const [mappings, setMappings] = useState<Record<string, { to: string; graduate: boolean }>>(
    () => {
      const init: Record<string, { to: string; graduate: boolean }> = {};
      for (const c of preview.classes) {
        init[c.className] = {
          to: suggestNextClass(c.className) ?? "",
          graduate: isFinalYearClass(c.className),
        };
      }
      return init;
    }
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [state, formAction] = useFormState(applyPromotionDecisionsAction, {
    ok: false,
    error: null,
    message: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menerapkan", state.error);
      } else if (state.ok) {
        toast.success("Keputusan diterapkan", state.message ?? undefined);
        startTransition(() => router.refresh());
      }
    }
  });

  const blocked = preview.totals.undecided > 0;
  const mappingsJson = JSON.stringify(
    preview.classes
      .filter((c) => c.naikCount > 0)
      .map((c) => ({
        fromClass: c.className,
        toClass: mappings[c.className]?.graduate
          ? ""
          : (mappings[c.className]?.to ?? "").trim(),
        graduate: mappings[c.className]?.graduate ?? false,
      }))
  );

  if (preview.totals.naik === 0 && preview.totals.undecided === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-[15px] text-muted-foreground">
        Belum ada keputusan Naik pada tahun {preview.sourceYear} untuk diterapkan.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {blocked && (
        <div className="rounded-xl border border-amber-600/25 bg-amber-50 p-4 text-[15px] text-amber-900">
          <p className="font-bold">
            Masih ada {preview.totals.undecided} siswa belum ditetapkan
          </p>
          <p className="mt-1">
            Selesaikan dulu semua keputusan di atas. Penerapan hanya bisa jalan
            bila tidak ada yang tertinggal.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="ap-target" className="text-[15px] font-semibold">
            Tahun tujuan
          </label>
          <select
            id="ap-target"
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
            className={inputClass}
          >
            {[preview.targetYearDefault, ...preview.yearOptions].filter(
              (y, i, arr) => arr.indexOf(y) === i
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="tnum text-sm text-muted-foreground">
          {preview.totals.naik} siswa akan pindah ke {targetYear}
        </p>
      </div>

      <form action={formAction} ref={formRef}>
        <input type="hidden" name="sourceYear" value={preview.sourceYear} />
        <input type="hidden" name="targetYear" value={targetYear} />
        <input type="hidden" name="mappingsJson" value={mappingsJson} />

        <ol className="grid gap-3 lg:grid-cols-2">
          {preview.classes
            .filter((c) => c.naikCount > 0)
            .map((c) => {
              const m = mappings[c.className] ?? { to: "", graduate: false };
              return (
                <li key={c.className || "__none__"} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-muted px-3 py-1.5 text-[15px] font-bold">
                      {c.className ? `Kelas ${c.className}` : "Tanpa kelas"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {c.naikCount} naik
                      {c.undecidedCount > 0 && ` • ${c.undecidedCount} belum ditetapkan`}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {m.graduate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-[15px] font-bold text-emerald-800">
                        <GraduationCap className="h-4 w-4" aria-hidden />
                        Lulus
                      </span>
                    ) : (
                      <input
                        aria-label={`Kelas tujuan untuk ${c.className || "tanpa kelas"}`}
                        value={m.to}
                        onChange={(e) =>
                          setMappings((prev) => ({
                            ...prev,
                            [c.className]: { ...prev[c.className], to: e.target.value },
                          }))
                        }
                        maxLength={50}
                        placeholder="Kelas tujuan..."
                        className={cn(inputClass, "min-h-[44px] flex-1 sm:min-w-32")}
                      />
                    )}
                  </div>
                  <label className="mt-2.5 flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px]">
                    <input
                      type="checkbox"
                      checked={m.graduate}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [c.className]: { ...prev[c.className], graduate: e.target.checked },
                        }))
                      }
                      className="h-5 w-5 accent-emerald-700"
                    />
                    Luluskan (tidak naik kelas)
                  </label>
                </li>
              );
            })}
        </ol>

        <div className="mt-4">
          <ExecuteButton disabled={blocked} onOpen={() => setConfirmOpen(true)} />
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Terapkan ke tahun tujuan"
        description={`${preview.totals.naik} siswa akan dicatat di tahun ${targetYear} sesuai peta di atas. Data tahun ${preview.sourceYear} tidak diubah. Bisa dijalankan ulang dengan aman bila ada yang kurang.`}
        confirmLabel="Terapkan"
        cancelLabel="Batal"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
