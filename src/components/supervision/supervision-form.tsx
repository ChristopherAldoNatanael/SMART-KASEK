"use client";

import { useFormState, useFormStatus } from "react-dom";
import { scheduleSupervisionAction } from "@/app/(shell)/supervision/actions";

export type TeacherOption = { id: string; name: string };

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
      {pending ? "Menjadwalkan..." : "Jadwalkan Supervisi"}
    </button>
  );
}

/**
 * Form penjadwalan: hanya siapa + kapan + tipe. Selalu tersimpan
 * sebagai draft tanpa nilai. Guru melengkapi 12 dokumen di halaman
 * detail, baru Kepala Sekolah mengisi penilaian di sana.
 */
export default function SupervisionForm({
  teachers,
  defaultDate,
  defaultTeacherId,
}: {
  teachers: TeacherOption[];
  defaultDate: string;
  defaultTeacherId?: string;
}) {
  const [state, formAction] = useFormState(scheduleSupervisionAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-6">
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
          <label htmlFor="teacherId" className="text-sm font-medium">
            Guru yang disupervisi <span className="text-destructive">*</span>
          </label>
          <select
            id="teacherId"
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
          <label htmlFor="supervisionDate" className="text-sm font-medium">
            Tanggal Supervisi <span className="text-destructive">*</span>
          </label>
          <input
            id="supervisionDate"
            name="supervisionDate"
            type="date"
            required
            defaultValue={defaultDate}
            className={inputClass}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="type" className="text-sm font-medium">
            Tipe Supervisi
          </label>
          <input
            id="type"
            name="type"
            type="text"
            maxLength={100}
            placeholder="mis. Supervisi kelas"
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Alur selanjutnya:</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-5">
          <li>Guru melengkapi 12 dokumen perangkat di halaman detail.</li>
          <li>Anda mengisi penilaian (indikator 0–100) di halaman detail.</li>
          <li>Ubah status menjadi Selesai, lalu buat Coaching.</li>
        </ol>
      </div>

      <div className="flex gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
