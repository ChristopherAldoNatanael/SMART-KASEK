"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createLessonPlanAction } from "@/app/(shell)/learning/actions";

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
      {pending ? "Menyimpan..." : "Simpan Modul Ajar"}
    </button>
  );
}

export default function LessonForm({
  teachers,
  isPrincipal,
}: {
  teachers: TeacherOption[];
  isPrincipal: boolean;
}) {
  const [state, formAction] = useFormState(createLessonPlanAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {isPrincipal && (
        <div className="space-y-2">
          <label htmlFor="teacherId" className="text-sm font-medium">
            Guru Pemilik <span className="text-destructive">*</span>
          </label>
          <select id="teacherId" name="teacherId" required className={inputClass}>
            <option value="">Pilih guru</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Judul Modul <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder="mis. Modul Ajar Matematika Kelas 7 — Aljabar"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium">
            Mata Pelajaran
          </label>
          <input id="subject" name="subject" type="text" maxLength={100} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="className" className="text-sm font-medium">
            Kelas
          </label>
          <input
            id="className"
            name="className"
            type="text"
            maxLength={50}
            placeholder="mis. VII-A"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="semester" className="text-sm font-medium">
            Semester
          </label>
          <input
            id="semester"
            name="semester"
            type="text"
            maxLength={20}
            placeholder="mis. Ganjil"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Deskripsi / Isi Singkat
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          placeholder="Tujuan pembelajaran, kegiatan inti, asesmen..."
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fileUrl" className="text-sm font-medium">
            Tautan Dokumen (opsional)
          </label>
          <input
            id="fileUrl"
            name="fileUrl"
            type="text"
            maxLength={500}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue="draft" className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Dipublikasikan</option>
            <option value="archived">Diarsipkan</option>
          </select>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
