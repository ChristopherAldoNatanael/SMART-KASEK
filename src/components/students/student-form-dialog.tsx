"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { X } from "lucide-react";
import {
  createStudentAction,
  updateStudentAction,
} from "@/app/(shell)/students/actions";
import {
  STUDENT_GENDER_LABELS,
  STUDENT_RELIGIONS,
  STUDENT_STATUS_LABELS,
} from "@/lib/students";
import { toast } from "@/components/toaster";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[48px] w-full rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
    </button>
  );
}

/**
 * Jendela tambah/ubah 1 siswa. Dipakai dari tabel Data Siswa.
 * Kelas & tahun ajaran bisa diketik bebas (ada saran dari data yang ada).
 */
export default function StudentFormDialog({
  open,
  onClose,
  row,
  defaultYear,
  yearOptions,
  classOptions,
  presetClass,
}: {
  open: boolean;
  onClose: () => void;
  row: Student | null;
  defaultYear: string;
  yearOptions: string[];
  classOptions: string[];
  /** Kelas awal saat tambah dari tampilan suatu kelas. */
  presetClass?: string;
}) {
  const router = useRouter();
  const editing = row !== null;
  const [state, formAction] = useFormState(
    editing ? updateStudentAction : createStudentAction,
    { ok: false, error: null, message: null }
  );

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success(
          editing ? "Perubahan tersimpan" : "Siswa baru tersimpan",
          state.message ?? undefined
        );
        onClose();
        router.refresh();
      }
    }
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Ubah data siswa" : "Tambah siswa baru"}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              {editing ? "Ubah data siswa" : "Tambah siswa baru"}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {editing
                ? `Mengubah data ${row.full_name}. Kelas dan tahun ajaran bisa diganti bila siswa naik kelas.`
                : "Isi data di bawah ini, lalu tekan Simpan."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form action={formAction} className="mt-4 space-y-4">
          {editing && <input type="hidden" name="studentId" value={row.id} />}

          <div className="space-y-1.5">
            <label htmlFor="s-nama" className="text-[15px] font-semibold">
              Nama lengkap <span className="text-destructive">*</span>
            </label>
            <input
              id="s-nama"
              name="fullName"
              required
              maxLength={100}
              defaultValue={row?.full_name ?? ""}
              placeholder="Contoh: Siti Aminah"
              autoFocus
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="s-induk" className="text-[15px] font-semibold">
                No. Induk
              </label>
              <input
                id="s-induk"
                name="noInduk"
                maxLength={50}
                defaultValue={row?.no_induk ?? ""}
                placeholder="Boleh kosong"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="s-nis" className="text-[15px] font-semibold">
                NISN
              </label>
              <input
                id="s-nis"
                name="studentNumber"
                maxLength={50}
                defaultValue={row?.student_number ?? ""}
                placeholder="Boleh kosong"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="s-kelas" className="text-[15px] font-semibold">
                Kelas
              </label>
              <input
                id="s-kelas"
                name="className"
                maxLength={50}
                list="s-kelas-saran"
                defaultValue={row?.class_name ?? presetClass ?? ""}
                placeholder="Contoh: III-B"
                className={inputClass}
              />
              <datalist id="s-kelas-saran">
                {classOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="s-jk" className="text-[15px] font-semibold">
                Jenis kelamin
              </label>
              <select
                id="s-jk"
                name="gender"
                defaultValue={row?.gender ?? ""}
                className={inputClass}
              >
                <option value="">Pilih...</option>
                {(Object.keys(STUDENT_GENDER_LABELS) as ("male" | "female")[]).map(
                  (g) => (
                    <option key={g} value={g}>
                      {STUDENT_GENDER_LABELS[g]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="s-agama" className="text-[15px] font-semibold">
                Agama
              </label>
              <input
                id="s-agama"
                name="religion"
                maxLength={50}
                list="s-agama-saran"
                defaultValue={row?.religion ?? ""}
                placeholder="Boleh kosong"
                className={inputClass}
              />
              <datalist id="s-agama-saran">
                {STUDENT_RELIGIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="s-status" className="text-[15px] font-semibold">
                Status
              </label>
              <select
                id="s-status"
                name="status"
                defaultValue={row?.status ?? "active"}
                className={inputClass}
              >
                {(Object.keys(STUDENT_STATUS_LABELS) as ("active" | "graduated" | "transferred" | "dropped")[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {STUDENT_STATUS_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="s-tahun" className="text-[15px] font-semibold">
              Tahun ajaran
            </label>
            <input
              id="s-tahun"
              name="academicYear"
              required
              maxLength={20}
              list="s-tahun-saran"
              defaultValue={row?.academic_year ?? defaultYear}
              placeholder="Contoh: 2026/2027"
              className={inputClass}
            />
            <datalist id="s-tahun-saran">
              {yearOptions.map((y) => (
                <option key={y} value={y} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted"
            >
              Batal
            </button>
            <SubmitButton editing={editing} />
          </div>
        </form>
      </div>
    </div>
  );
}
