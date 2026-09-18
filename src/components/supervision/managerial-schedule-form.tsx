"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { scheduleManagerialAction } from "@/app/(shell)/supervision/manajerial/actions";
import { toast } from "@/components/toaster";

export type ManagerialTeacherOption = { id: string; name: string };

// text-base di HP agar layar tidak otomatis zoom saat mengetik.
const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[48px] rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Membuat, tunggu sebentar..." : "Buat Supervisi Manajerial"}
    </button>
  );
}

/**
 * Form pembuatan supervisi manajerial: pilih guru + tahun pelajaran/periode.
 * Tersimpan sebagai draft; Instrumen 1–3 diisi di halaman detail.
 */
export default function ManagerialScheduleForm({
  teachers,
  defaultDate,
  defaultTeacherId,
  defaultAcademicYear,
}: {
  teachers: ManagerialTeacherOption[];
  defaultDate: string;
  defaultTeacherId?: string;
  defaultAcademicYear?: string;
}) {
  const [state, formAction] = useFormState(scheduleManagerialAction, {
    ok: false,
    error: null,
  });

  // Semua kegagalan tampil sebagai notifikasi toast agar jelas terlihat.
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil dibuat", state.error);
      }
    }
  });

  return (
    <form action={formAction} className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="m-teacherId" className="text-[15px] font-semibold">
            Guru yang disupervisi <span className="text-destructive">*</span>
          </label>
          <select
            id="m-teacherId"
            name="teacherId"
            required
            defaultValue={defaultTeacherId ?? ""}
            className={inputClass}
          >
            <option value="">Pilih guru</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="m-supervisionDate" className="text-[15px] font-semibold">
            Tanggal Supervisi <span className="text-destructive">*</span>
          </label>
          <input
            id="m-supervisionDate"
            name="supervisionDate"
            type="date"
            required
            defaultValue={defaultDate}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="m-academicYear" className="text-[15px] font-semibold">
            Tahun Pelajaran
          </label>
          <input
            id="m-academicYear"
            name="academicYear"
            type="text"
            maxLength={20}
            defaultValue={defaultAcademicYear ?? "2026/2027"}
            placeholder="mis. 2026/2027"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="m-period" className="text-[15px] font-semibold">
            Periode Supervisi
          </label>
          <input
            id="m-period"
            name="period"
            type="text"
            maxLength={60}
            placeholder="mis. Oktober 2026 — Putaran I"
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-xl border border-sky-600/20 bg-sky-50 p-4 text-[15px] leading-relaxed text-sky-900">
        <p className="font-bold">Langkah selanjutnya:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Isi <strong>Instrumen 1</strong> — Administrasi Kelas (13 pertanyaan).</li>
          <li>Isi <strong>Instrumen 2</strong> — Perencanaan Pembelajaran (10 pertanyaan).</li>
          <li>Isi <strong>Instrumen 3</strong> — ATP/Silabus (11 pertanyaan).</li>
          <li>Tekan <strong>finalisasi</strong> — nilai langsung dihitung otomatis.</li>
        </ol>
        <p className="mt-2">
          Tenang, semua bisa disimpan sementara dan dilanjutkan kapan saja.
        </p>
      </div>

      <div className="flex gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
