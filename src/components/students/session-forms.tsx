"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  closeAttendanceSessionAction,
  createAttendanceSessionAction,
  type StudentActionState,
} from "@/app/(shell)/students/actions";
import { toast } from "@/components/toaster";
import { todayWIB } from "@/lib/students";

const INIT: StudentActionState = { ok: false, error: null, message: null };

function useActionFeedback(
  state: StudentActionState,
  successTitle: string
): void {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil", state.error);
      } else if (state.ok) {
        toast.success(successTitle, state.message ?? undefined);
        // Realtime: paksa ambil data server terbaru agar QR langsung
        // muncul/hilang tanpa perlu reload manual di HP guru.
        startTransition(() => router.refresh());
      }
    }
  }, [state, successTitle, router]);
}

function CreateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className="inline-flex min-h-[48px] items-center rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Membuka sesi..." : "Buka sesi QR"}
    </button>
  );
}

function CloseSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className="inline-flex min-h-[48px] items-center rounded-lg border-2 border-destructive/60 px-4 py-2.5 text-[15px] font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Menutup..." : "Tutup sesi"}
    </button>
  );
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
  useActionFeedback(state, "Sesi QR dibuka");
  // Peringatan dini bila tanggal masih kemarin (WIB): server akan menolak
  // agar sesi tidak langsung mati. Guru harus ketuk "Hari ini" dulu.
  const isPast = date < todayWIB();
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="academicYear" value={academicYear} />
      <input type="hidden" name="className" value={className} />
      <input type="hidden" name="date" value={date} />
      {isPast && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 sm:col-span-2"
        >
          Tanggal masih kemarin. Ketuk tombol “Hari ini” di atas dulu agar
          tanggal jadi hari ini (WIB), baru buka sesi QR.
        </p>
      )}
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
          Format 24 jam WIB, 00:00–23:59. Boleh pakai titik (07.15) atau titik
          dua (07:15). Lewat jam ini = Terlambat (waktu server WIB).
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
          Cth. 13.15 untuk jam 1 siang WIB. Harus setelah batas tepat waktu.
          Lewat jam ini QR otomatis kedaluwarsa.
        </span>
      </label>
      <div className="sm:col-span-2">
        <CreateSubmitButton />
      </div>
    </form>
  );
}

export function CloseSessionButton({ sessionId }: { sessionId: string }) {
  const [state, action] = useFormState(closeAttendanceSessionAction, INIT);
  useActionFeedback(state, "Sesi ditutup");
  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <CloseSubmitButton />
    </form>
  );
}
