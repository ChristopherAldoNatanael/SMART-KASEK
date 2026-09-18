"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { saveMyAssignmentsAction } from "@/app/(shell)/students/actions";
import { toast } from "@/components/toaster";

export type AssignmentRow = {
  id: string;
  class_name: string;
  subject: string;
};

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan daftar"}
    </button>
  );
}

/**
 * "Kelas yang saya ajar" (akun guru): daftar kelas + mapel per tahun
 * ajaran. Dipakai sebagai jalan pintas di Rekap Absensi.
 * Ubah bebas di sini, lalu tekan Simpan daftar.
 */
export default function MyClasses({
  academicYear,
  defaultSubject,
  initial,
  classOptions,
}: {
  academicYear: string;
  defaultSubject: string;
  initial: AssignmentRow[];
  /** Daftar kelas dari Kepala Sekolah. Kosong = ketik manual. */
  classOptions: string[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(
    initial.map((r) => ({ key: r.id, className: r.class_name, subject: r.subject }))
  );
  const [newClass, setNewClass] = useState("");
  const [newSubject, setNewSubject] = useState(defaultSubject);

  const [state, formAction] = useFormState(saveMyAssignmentsAction, {
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
        toast.success("Daftar tersimpan", state.message ?? undefined);
        router.refresh();
      }
    }
  });

  function addRow() {
    if (!newClass.trim() || !newSubject.trim()) {
      toast.error(
        "Belum lengkap",
        "Isi kelas dan mapel dulu sebelum menambah baris."
      );
      return;
    }
    setRows((prev) => [
      ...prev,
      { key: `baru-${Date.now()}`, className: newClass.trim(), subject: newSubject.trim() },
    ]);
    setNewClass("");
  }

  function editRow(key: string, patch: { className?: string; subject?: string }) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.className.trim() && r.subject.trim())
      .map((r) => ({ className: r.className.trim(), subject: r.subject.trim() }))
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="academicYear" value={academicYear} />
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <p className="text-sm text-muted-foreground">
        Berlaku untuk tahun ajaran {academicYear}. Dipakai sebagai jalan pintas
        kelas di halaman ini.
      </p>

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-[15px] text-muted-foreground">
          Belum ada. Tambahkan kelas yang Anda ajar beserta mapelnya di bawah.
        </p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li
            key={r.key}
            className="flex items-center gap-2 rounded-xl border bg-card p-3"
          >
            {classOptions.length > 0 ? (
              <select
                aria-label="Kelas yang diajar"
                value={classOptions.includes(r.className) ? r.className : ""}
                onChange={(e) => editRow(r.key, { className: e.target.value })}
                className={inputClass}
              >
                <option value="">Pilih kelas...</option>
                {classOptions.map((o) => (
                  <option key={o} value={o}>
                    Kelas {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Kelas yang diajar"
                value={r.className}
                onChange={(e) => editRow(r.key, { className: e.target.value })}
                maxLength={50}
                placeholder="Kelas, mis. I-A"
                className={inputClass}
              />
            )}
            <input
              aria-label="Mapel yang diajar"
              value={r.subject}
              onChange={(e) => editRow(r.key, { subject: e.target.value })}
              maxLength={100}
              placeholder="Mapel"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeRow(r.key)}
              aria-label={`Hapus ${r.className} ${r.subject}`}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 rounded-xl border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto]">
        {classOptions.length > 0 ? (
          <select
            aria-label="Kelas baru"
            value={classOptions.includes(newClass) ? newClass : ""}
            onChange={(e) => setNewClass(e.target.value)}
            className={inputClass}
          >
            <option value="">Pilih kelas...</option>
            {classOptions.map((o) => (
              <option key={o} value={o}>
                Kelas {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label="Kelas baru"
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            maxLength={50}
            placeholder="Kelas, mis. II-B"
            className={inputClass}
          />
        )}
        <input
          aria-label="Mapel baru"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          maxLength={100}
          placeholder="Mapel, mis. Matematika"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Tambah
        </button>
      </div>

      <SaveButton />
    </form>
  );
}
