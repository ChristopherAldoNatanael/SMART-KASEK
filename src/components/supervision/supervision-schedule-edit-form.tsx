"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateSupervisionScheduleAction } from "@/app/(shell)/supervision/actions";
import type { TeacherOption } from "./supervision-form";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan Perubahan"}
    </button>
  );
}

export type SupervisionScheduleInitial = {
  teacherId: string;
  supervisionDate: string;
  type: string | null;
  academicYear: string | null;
};

/**
 * Form ubah jadwal supervisi: field sama seperti form penjadwalan
 * (guru + tanggal + tahun pelajaran + tipe), terisi awal dari data
 * tersimpan. Dokumen, penilaian, dan status tidak ikut berubah.
 */
export default function SupervisionScheduleEditForm({
  supervisionId,
  teachers,
  initial,
}: {
  supervisionId: string;
  teachers: TeacherOption[];
  initial: SupervisionScheduleInitial;
}) {
  const [state, formAction] = useFormState(updateSupervisionScheduleAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="supervisionId" value={supervisionId} />
      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="edit-teacherId" className="text-sm font-medium">
            Guru yang disupervisi <span className="text-destructive">*</span>
          </label>
          <select
            id="edit-teacherId"
            name="teacherId"
            required
            defaultValue={initial.teacherId}
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
          <label htmlFor="edit-supervisionDate" className="text-sm font-medium">
            Tanggal Supervisi <span className="text-destructive">*</span>
          </label>
          <input
            id="edit-supervisionDate"
            name="supervisionDate"
            type="date"
            required
            defaultValue={initial.supervisionDate}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-academicYear" className="text-sm font-medium">
            Tahun Pelajaran
          </label>
          <input
            id="edit-academicYear"
            name="academicYear"
            type="text"
            maxLength={20}
            defaultValue={initial.academicYear ?? ""}
            placeholder="mis. 2026/2027"
            pattern="\d{4}/\d{4}"
            title="Format YYYY/YYYY, mis. 2026/2027. Kosongkan untuk mengikuti tanggal supervisi."
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            Kosongkan untuk mengikuti tanggal supervisi secara otomatis.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-type" className="text-sm font-medium">
            Tipe Supervisi
          </label>
          <input
            id="edit-type"
            name="type"
            type="text"
            maxLength={100}
            defaultValue={initial.type ?? ""}
            placeholder="mis. Supervisi kelas"
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p>
          Dokumen yang sudah diunggah guru, penilaian instrumen, dan status
          supervisi tidak berubah — hanya data jadwal di atas yang diperbarui.
        </p>
      </div>

      <div className="flex gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
