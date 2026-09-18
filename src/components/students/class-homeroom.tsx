"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { UserRound } from "lucide-react";
import { assignHomeroomAction } from "@/app/(shell)/students/actions";
import { toast } from "@/components/toaster";

export type HomeroomTeacherOption = {
  id: string;
  name: string;
  subject: string | null;
};

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[48px] w-full rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

/**
 * Wali kelas di kartu kelas: semua peran bisa melihat,
 * hanya Kepala Sekolah yang bisa menekan "Atur".
 */
export default function ClassHomeroom({
  className,
  waliName,
  canAssign,
  teachers,
}: {
  className: string | null;
  waliName: string | null;
  canAssign: boolean;
  teachers: HomeroomTeacherOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(assignHomeroomAction, {
    ok: false,
    error: null,
    message: null,
  });

  const last = useRef(state);
  // Pola toast-after-action yang sama dipakai di seluruh form aplikasi.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success("Wali kelas tersimpan", state.message ?? undefined);
        setOpen(false);
        router.refresh();
      }
    }
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" aria-hidden />
        Wali: <strong className="font-semibold text-foreground">{waliName ?? "Belum diisi"}</strong>
      </span>
      {canAssign && className && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-[36px] rounded-md px-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand/10"
        >
          Atur
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Atur wali kelas ${className}`}
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Wali kelas {className}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pilih guru. Wali lama kelas ini otomatis diganti.
            </p>
            <form action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="className" value={className ?? ""} />
              <div className="space-y-1.5">
                <label htmlFor="hw-guru" className="text-[15px] font-semibold">
                  Guru
                </label>
                <select
                  id="hw-guru"
                  name="teacherId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">Kosongkan (tanpa wali)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.subject ? ` — ${t.subject}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[48px] rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted"
                >
                  Batal
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </span>
  );
}
