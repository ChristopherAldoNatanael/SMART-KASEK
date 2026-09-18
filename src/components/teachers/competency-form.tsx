"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  saveCompetencyAction,
  updateProfileAction,
  updateTeachingAction,
} from "@/app/(shell)/teachers/actions";

export type CompetencyOption = {
  id: string;
  name: string;
  category: string;
  latestScore: number | null;
};

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton({
  label = "Simpan Nilai",
  pendingLabel = "Menyimpan…",
}: {
  label?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function StateMessage({ error, ok }: { error: string | null; ok: boolean }) {
  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
      >
        {error}
      </div>
    );
  }
  if (ok) {
    return (
      <div
        role="status"
        className="rounded-md bg-emerald-700/10 p-3 text-sm text-emerald-800"
      >
        Berhasil disimpan.
      </div>
    );
  }
  return null;
}

export default function CompetencyForm({
  teacherId,
  competencies,
}: {
  teacherId: string;
  competencies: CompetencyOption[];
}) {  const [state, formAction] = useFormState(saveCompetencyAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="teacherId" value={teacherId} />
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}
      {state.ok && (
        <div
          role="status"
          className="rounded-md bg-emerald-700/10 p-3 text-sm text-emerald-800"
        >
          Nilai tersimpan — profil perkembangan diperbarui.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="space-y-1.5">
          <label htmlFor="competencyId" className="text-xs font-medium text-muted-foreground">
            Kompetensi
          </label>
          <select id="competencyId" name="competencyId" required className={inputClass}>
            <option value="">Pilih…</option>
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.latestScore ?? "—"})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="score" className="text-xs font-medium text-muted-foreground">
            Skor 0–100
          </label>
          <input
            id="score"
            name="score"
            type="number"
            required
            min={0}
            max={100}
            placeholder="80"
            className={`${inputClass} tnum`}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="competency-notes" className="text-xs font-medium text-muted-foreground">
          Dasar penilaian / bukti <span className="text-destructive">*</span>
        </label>
        <textarea
          id="competency-notes"
          name="notes"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          placeholder="mis. Observasi kelas 12 Sep 2026: membuka dengan apersepsi, memakai LKPD kelompok, menutup dengan refleksi. Bukti: foto papan tulis + LKPD."
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Wajib diisi (min. 10 karakter) — setiap skor harus bisa
          dipertanggungjawabkan: kapan diobservasi dan bukti apa yang dilihat.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Tersimpan sebagai sumber “Penilaian Kepala Sekolah”. Skor dari
        Supervisi, Coaching, Asesmen, atau Penilaian Diri hanya dibuat sistem
        dari aktivitas tercatat dan tampil otomatis di daftar atas.
      </p>
      <SubmitButton />
    </form>
  );
}

/**
 * Edit teaching assignment: subject + homeroom class.
 * Empty homeroom clears the Wali Kelas status (same teachers row).
 */
export function TeachingForm({
  teacherId,
  subject,
  homeroomClass,
  nip,
  classOptions,
}: {
  teacherId: string;
  subject: string | null;
  homeroomClass: string | null;
  nip: string | null;
  /** Daftar kelas dari Kepala Sekolah. Kosong = ketik manual. */
  classOptions?: string[];
}) {
  const [state, formAction] = useFormState(updateTeachingAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="teacherId" value={teacherId} />
      <StateMessage error={state.error} ok={state.ok} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor="teaching-subject"
            className="text-xs font-medium text-muted-foreground"
          >
            Mata Pelajaran
          </label>
          <input
            id="teaching-subject"
            name="subject"
            type="text"
            maxLength={100}
            defaultValue={subject ?? ""}
            placeholder="mis. Matematika"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="teaching-nip"
            className="text-xs font-medium text-muted-foreground"
          >
            NIP
          </label>
          <input
            id="teaching-nip"
            name="nip"
            type="text"
            maxLength={50}
            defaultValue={nip ?? ""}
            placeholder="mis. 198501012010011001"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="teaching-homeroom"
            className="text-xs font-medium text-muted-foreground"
          >
            Wali Kelas
          </label>
          {(classOptions ?? []).length > 0 ? (
            <select
              id="teaching-homeroom"
              name="homeroomClass"
              defaultValue={
                homeroomClass && (classOptions ?? []).includes(homeroomClass)
                  ? homeroomClass
                  : ""
              }
              className={inputClass}
            >
              <option value="">Bukan wali kelas</option>
              {(classOptions ?? []).map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="teaching-homeroom"
              name="homeroomClass"
              type="text"
              maxLength={50}
              defaultValue={homeroomClass ?? ""}
              placeholder="mis. I-A — kosongkan bila bukan"
              className={inputClass}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Kosongkan kolom Wali Kelas untuk menonaktifkan statusnya.
      </p>
      <SubmitButton label="Simpan Perubahan" pendingLabel="Menyimpan…" />
    </form>
  );
}

/**
 * Edit teacher basic data (principal only).
 */
export function TeacherProfileForm({
  teacherId,
  fullName,
  employeeNumber,
  department,
  educationLevel,
  employmentStatus,
  joinedAt,
}: {
  teacherId: string;
  fullName: string;
  employeeNumber: string | null;
  department: string | null;
  educationLevel: string | null;
  employmentStatus: string | null;
  joinedAt: string | null;
}) {
  const [state, formAction] = useFormState(updateProfileAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="teacherId" value={teacherId} />
      <StateMessage error={state.error} ok={state.ok} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor="profile-fullName"
            className="text-xs font-medium text-muted-foreground"
          >
            Nama Lengkap
          </label>
          <input
            id="profile-fullName"
            name="fullName"
            type="text"
            required
            minLength={3}
            maxLength={200}
            defaultValue={fullName}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="profile-employeeNumber"
            className="text-xs font-medium text-muted-foreground"
          >
            NUPTK / Nomor Pegawai
          </label>
          <input
            id="profile-employeeNumber"
            name="employeeNumber"
            type="text"
            maxLength={50}
            defaultValue={employeeNumber ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="profile-department"
            className="text-xs font-medium text-muted-foreground"
          >
            Departemen / Rumpun
          </label>
          <input
            id="profile-department"
            name="department"
            type="text"
            maxLength={100}
            defaultValue={department ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="profile-education"
            className="text-xs font-medium text-muted-foreground"
          >
            Pendidikan Terakhir
          </label>
          <input
            id="profile-education"
            name="educationLevel"
            type="text"
            maxLength={50}
            defaultValue={educationLevel ?? ""}
            placeholder="mis. S1"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="profile-employment"
              className="text-xs font-medium text-muted-foreground"
            >
              Status Kepegawaian
            </label>
            <input
              id="profile-employment"
              name="employmentStatus"
              type="text"
              maxLength={30}
              defaultValue={employmentStatus ?? ""}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="profile-joined"
              className="text-xs font-medium text-muted-foreground"
            >
              TMT
            </label>
            <input
              id="profile-joined"
              name="joinedAt"
              type="date"
              defaultValue={joinedAt ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </div>
      <SubmitButton label="Simpan Data" pendingLabel="Menyimpan…" />
    </form>
  );
}
