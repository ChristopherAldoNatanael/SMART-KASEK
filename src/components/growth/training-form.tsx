"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  createTrainingAction,
  updateTrainingAction,
  type TrainingActionState,
} from "@/app/(shell)/growth/actions";
import { toast } from "@/components/toaster";

export type TrainingTeacherOption = { id: string; name: string };

export type TrainingInitial = {
  id: string;
  name: string;
  description: string | null;
  organizer: string | null;
  trainingDate: string | null;
  scheduleTime: string | null;
  location: string | null;
  durationHours: number | null;
  points: number;
  participantIds: string[];
};

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-xs font-medium text-muted-foreground";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Simpan Pelatihan"}
    </button>
  );
}

const INITIAL_STATE: TrainingActionState = { ok: false, error: null, trainingId: null };

/**
 * Form tambah/ubah pelatihan. Kepala Sekolah mengisi data kegiatan
 * SEKALI (termasuk poin), lalu mencentang guru peserta dari data
 * guru yang sudah ada — tanpa membuat data guru baru.
 */
export default function TrainingForm({
  teachers,
  initial,
}: {
  teachers: TrainingTeacherOption[];
  initial?: TrainingInitial;
}) {
  const isEdit = !!initial;
  const action = isEdit ? updateTrainingAction : createTrainingAction;
  const [state, formAction] = useFormState(action, INITIAL_STATE);
  const router = useRouter();
  const last = useRef(state);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<string[]>(initial?.participantIds ?? []);

  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success(
          isEdit ? "Pelatihan diperbarui" : "Pelatihan tersimpan",
          "Rekap Teacher Growth ikut diperbarui otomatis."
        );
        router.push("/growth");
        router.refresh();
      }
    }
  });

  const filtered =
    query.trim() === ""
      ? teachers
      : teachers.filter((t) =>
          t.name.toLowerCase().includes(query.trim().toLowerCase())
        );

  function toggle(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="trainingId" value={initial.id} />}
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="training-name" className={labelClass}>
          Nama Pelatihan <span className="text-destructive">*</span>
        </label>
        <input
          id="training-name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={200}
          defaultValue={initial?.name ?? ""}
          placeholder="mis. Workshop Pembelajaran Digital"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="training-description" className={labelClass}>
          Deskripsi (opsional)
        </label>
        <textarea
          id="training-description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={initial?.description ?? ""}
          placeholder="Ringkasan materi atau tujuan pelatihan"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="training-organizer" className={labelClass}>
            Penyelenggara
          </label>
          <input
            id="training-organizer"
            name="organizer"
            type="text"
            maxLength={150}
            defaultValue={initial?.organizer ?? ""}
            placeholder="mis. Dinas Pendidikan"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="training-location" className={labelClass}>
            Lokasi (opsional)
          </label>
          <input
            id="training-location"
            name="location"
            type="text"
            maxLength={150}
            defaultValue={initial?.location ?? ""}
            placeholder="mis. Aula sekolah"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="training-date" className={labelClass}>
            Tanggal Pelaksanaan
          </label>
          <input
            id="training-date"
            name="trainingDate"
            type="date"
            defaultValue={initial?.trainingDate ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="training-schedule" className={labelClass}>
            Waktu / Jadwal
          </label>
          <input
            id="training-schedule"
            name="scheduleTime"
            type="text"
            maxLength={50}
            defaultValue={initial?.scheduleTime ?? ""}
            placeholder="mis. 08.00 - 15.00"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="training-duration" className={labelClass}>
            Durasi / JP (opsional)
          </label>
          <input
            id="training-duration"
            name="durationHours"
            type="number"
            min={0}
            step="0.5"
            defaultValue={initial?.durationHours ?? ""}
            placeholder="mis. 8"
            className={`${inputClass} tnum`}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="training-points" className={labelClass}>
            Poin <span className="text-destructive">*</span>
          </label>
          <input
            id="training-points"
            name="points"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={initial?.points ?? 10}
            placeholder="mis. 10"
            className={`${inputClass} tnum`}
          />
          <p className="text-xs text-muted-foreground">
            Berlaku sama untuk setiap peserta.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>
          Guru Peserta <span className="text-destructive">*</span>
        </legend>
        {teachers.length > 5 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama guru…"
            aria-label="Cari nama guru"
            className={inputClass}
          />
        )}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada guru yang cocok dengan pencarian.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {filtered.map((t) => (
              <li key={t.id}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                  <input
                    type="checkbox"
                    name="teacherIds"
                    value={t.id}
                    checked={checked.includes(t.id)}
                    onChange={() => toggle(t.id)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 truncate">{t.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          {checked.length > 0
            ? `${checked.length} guru dipilih — masing-masing memperoleh poin kegiatan ini.`
            : "Pilih minimal satu guru dari data guru yang sudah ada."}
        </p>
      </fieldset>

      <SubmitButton isEdit={isEdit} />
    </form>
  );
}
