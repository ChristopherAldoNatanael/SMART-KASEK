"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Pencil } from "lucide-react";
import {
  createProgramAction,
  updateProgramDetailsAction,
  updateProgramStatusAction,
  type ProgramActionState,
} from "@/app/(shell)/programs/actions";
import type { ProgramWithProgress } from "@/services/program.service";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

const INIT: ProgramActionState = { ok: false, error: null, message: null };

function useProgramToast(state: ProgramActionState, successTitle: string): void {
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) toast.error("Belum berhasil", state.error);
      else if (state.ok) toast.success(successTitle, state.message ?? undefined);
    }
  }, [state, successTitle]);
}

const INPUT_CLASS =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 text-[15px]";
const LABEL_CLASS = "grid gap-1 text-sm font-medium";

/** Form tambah program baru — selalu mulai sebagai Direncanakan. */
export function CreateProgramForm({
  defaultSemester,
  defaultAcademicYear,
  yearOptions,
}: {
  defaultSemester: 1 | 2;
  defaultAcademicYear: string;
  yearOptions: string[];
}) {
  const [state, action] = useFormState(createProgramAction, INIT);
  useProgramToast(state, "Program ditambahkan");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className={LABEL_CLASS}>
        Semester
        <select name="semester" defaultValue={String(defaultSemester)} className={INPUT_CLASS}>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Tahun pelajaran
        <select name="academicYear" defaultValue={defaultAcademicYear} className={INPUT_CLASS}>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className={cn(LABEL_CLASS, "sm:col-span-2")}>
        Nama program
        <input
          name="name"
          required
          minLength={3}
          maxLength={120}
          placeholder="cth. MPLS Kelas 1"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </label>
      <label className={LABEL_CLASS}>
        Kategori (opsional)
        <input
          name="category"
          maxLength={60}
          placeholder="cth. Akademik, Sarpras"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </label>
      <label className={LABEL_CLASS}>
        Anggaran Rp (opsional)
        <input
          name="budget"
          inputMode="numeric"
          placeholder="cth. 5000000"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </label>
      <label className={LABEL_CLASS}>
        Tanggal mulai (opsional)
        <input name="startDate" type="date" className={INPUT_CLASS} />
      </label>
      <label className={LABEL_CLASS}>
        Tanggal selesai (opsional)
        <input name="endDate" type="date" className={INPUT_CLASS} />
      </label>
      <label className={cn(LABEL_CLASS, "sm:col-span-2")}>
        Deskripsi (opsional)
        <textarea
          name="description"
          rows={2}
          maxLength={2000}
          placeholder="Tujuan dan gambaran singkat program"
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-[15px]"
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="inline-flex min-h-[48px] items-center rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Tambah program
        </button>
      </div>
    </form>
  );
}

/** Tombol pindah status satu arah (Mulai/Selesai/Batalkan/Buka lagi). */
export function ProgramStatusButton({
  programId,
  status,
  label,
  tone = "neutral",
}: {
  programId: string;
  status: "ongoing" | "completed" | "cancelled" | "planned";
  label: string;
  tone?: "neutral" | "primary" | "danger";
}) {
  const [state, action] = useFormState(updateProgramStatusAction, INIT);
  useProgramToast(state, "Status diperbarui");
  return (
    <form action={action}>
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={cn(
          "inline-flex min-h-[44px] items-center rounded-lg border-2 px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted",
          tone === "primary" && "border-primary/60 text-primary",
          tone === "danger" && "border-destructive/60 text-destructive"
        )}
      >
        {label}
      </button>
    </form>
  );
}

/** Form ubah detail dalam dialog popup — tabel tetap rapi. */
export function EditProgramForm({
  program,
  yearOptions,
}: {
  program: ProgramWithProgress;
  yearOptions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(updateProgramDetailsAction, INIT);
  useProgramToast(state, "Perubahan tersimpan");

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ubah ${program.name}`}
        aria-haspopup="dialog"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Ubah
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ubah ${program.name}`}
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border bg-card p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold leading-snug">Ubah kegiatan</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{program.name}</p>
            <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="programId" value={program.id} />
              <label className={LABEL_CLASS}>
                Semester
                <select
                  name="semester"
                  defaultValue={String(program.semester ?? 1)}
                  className={INPUT_CLASS}
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </label>
              <label className={LABEL_CLASS}>
                Tahun pelajaran
                <select
                  name="academicYear"
                  defaultValue={program.academic_year ?? yearOptions[0] ?? ""}
                  className={INPUT_CLASS}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cn(LABEL_CLASS, "sm:col-span-2")}>
                Nama kegiatan
                <input
                  name="name"
                  required
                  minLength={3}
                  maxLength={120}
                  defaultValue={program.name}
                  autoComplete="off"
                  autoFocus
                  className={INPUT_CLASS}
                />
              </label>
              <label className={cn(LABEL_CLASS, "sm:col-span-2")}>
                Keterangan (opsional)
                <textarea
                  name="description"
                  rows={2}
                  maxLength={2000}
                  defaultValue={program.description ?? ""}
                  placeholder="cth. Peserta kelas 4-6"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-[15px]"
                />
              </label>
              <label className={LABEL_CLASS}>
                Tanggal mulai (opsional)
                <input
                  name="startDate"
                  type="date"
                  defaultValue={program.start_date ?? ""}
                  className={INPUT_CLASS}
                />
              </label>
              <label className={LABEL_CLASS}>
                Tanggal selesai (opsional)
                <input
                  name="endDate"
                  type="date"
                  defaultValue={program.end_date ?? ""}
                  className={INPUT_CLASS}
                />
              </label>
              <label className={LABEL_CLASS}>
                Kategori (opsional)
                <input
                  name="category"
                  maxLength={60}
                  defaultValue={program.category ?? ""}
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </label>
              <label className={LABEL_CLASS}>
                Anggaran Rp (opsional)
                <input
                  name="budget"
                  inputMode="numeric"
                  defaultValue={program.budget ?? ""}
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </label>
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[48px] rounded-lg border px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] rounded-lg bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
