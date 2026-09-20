"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import {
  closeAttendanceSessionAction,
  createAttendanceSessionAction,
  type StudentActionState,
} from "@/app/(shell)/students/actions";
import { toast } from "@/components/toaster";

const INIT: StudentActionState = { ok: false, error: null, message: null };

function useActionToast(
  state: StudentActionState,
  successTitle: string
): void {
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) toast.error("Belum berhasil", state.error);
      else if (state.ok) toast.success(successTitle, state.message ?? undefined);
    }
  }, [state, successTitle]);
}

export function CreateSessionForm({
  academicYear,
  className,
  date,
}: {
  academicYear: string;
  className: string;
  date: string;
}) {
  const [state, action] = useFormState(createAttendanceSessionAction, INIT);
  useActionToast(state, "Sesi QR dibuka");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="academicYear" value={academicYear} />
      <input type="hidden" name="className" value={className} />
      <input type="hidden" name="date" value={date} />
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Nama sesi
        <input
          name="label"
          defaultValue="Absensi Pagi"
          maxLength={80}
          className="min-h-[48px] rounded-lg border bg-background px-3 text-[15px]"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Batas tepat waktu (opsional)
        <input
          name="lateAfter"
          type="text"
          inputMode="numeric"
          placeholder="07:15"
          maxLength={5}
          autoComplete="off"
          className="min-h-[48px] rounded-lg border bg-background px-3 text-[15px]"
        />
        <span className="text-xs font-normal text-muted-foreground">
          Format 24 jam, 00:00–23:59. Boleh pakai titik (07.15) atau titik dua
          (07:15). Lewat jam ini = Terlambat (waktu server).
        </span>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Sesi berakhir (opsional)
        <input
          name="endsAt"
          type="text"
          inputMode="numeric"
          placeholder="07:30"
          maxLength={5}
          autoComplete="off"
          className="min-h-[48px] rounded-lg border bg-background px-3 text-[15px]"
        />
        <span className="text-xs font-normal text-muted-foreground">
          Cth. 13.15 untuk jam 1 siang. Harus setelah batas tepat waktu. Lewat
          jam ini QR otomatis kedaluwarsa.
        </span>
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="inline-flex min-h-[48px] items-center rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Buka sesi QR
        </button>
      </div>
    </form>
  );
}

export function CloseSessionButton({ sessionId }: { sessionId: string }) {
  const [state, action] = useFormState(closeAttendanceSessionAction, INIT);
  useActionToast(state, "Sesi ditutup");
  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        className="inline-flex min-h-[48px] items-center rounded-lg border-2 border-destructive/60 px-4 py-2.5 text-[15px] font-semibold text-destructive transition-colors hover:bg-destructive/5"
      >
        Tutup sesi
      </button>
    </form>
  );
}
