"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  chooseRoleAction,
  createSchoolAction,
  joinSchoolAction,
} from "@/app/onboarding/actions";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
    >
      {error}
    </div>
  );
}

export function RolePickerForm() {
  const [state, formAction] = useFormState(chooseRoleAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <FormError error={state.error} />
      <div className="grid gap-3">
        <button
          type="submit"
          name="role"
          value="principal"
          className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50"
        >
          <p className="font-semibold">Saya Kepala Sekolah</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Membuat dan mengelola sekolah, mengundang guru, memantau
            perkembangan pembelajaran.
          </p>
        </button>
        <button
          type="submit"
          name="role"
          value="teacher"
          className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50"
        >
          <p className="font-semibold">Saya Guru</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bergabung ke sekolah dengan kode undangan dari Kepala Sekolah.
          </p>
        </button>
      </div>
    </form>
  );
}

export function CreateSchoolForm() {
  const [state, formAction] = useFormState(createSchoolAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      <div className="space-y-2">
        <label htmlFor="school-name" className="text-sm font-medium">
          Nama Sekolah <span className="text-destructive">*</span>
        </label>
        <input
          id="school-name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder="mis. SDN 01 Contoh"
          className={inputClass}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="school-npsn" className="text-sm font-medium">
            NPSN (opsional)
          </label>
          <input
            id="school-npsn"
            name="npsn"
            type="text"
            maxLength={20}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="school-phone" className="text-sm font-medium">
            Telepon (opsional)
          </label>
          <input
            id="school-phone"
            name="phone"
            type="text"
            maxLength={30}
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="school-address" className="text-sm font-medium">
          Alamat (opsional)
        </label>
        <textarea
          id="school-address"
          name="address"
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="school-email" className="text-sm font-medium">
          Email Sekolah (opsional)
        </label>
        <input
          id="school-email"
          name="email"
          type="email"
          maxLength={200}
          className={inputClass}
        />
      </div>
      <SubmitButton label="Buat Sekolah" pendingLabel="Membuat..." />
      <p className="text-xs text-muted-foreground">
        Setelah sekolah dibuat, Anda akan menerima kode undangan untuk
        dibagikan kepada guru.
      </p>
    </form>
  );
}

export function JoinSchoolForm() {
  const [state, formAction] = useFormState(joinSchoolAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      <div className="space-y-2">
        <label htmlFor="invite-code" className="text-sm font-medium">
          Kode Undangan <span className="text-destructive">*</span>
        </label>
        <input
          id="invite-code"
          name="code"
          type="text"
          required
          minLength={4}
          maxLength={20}
          placeholder="mis. A7K2P9QX"
          autoComplete="off"
          className={`${inputClass} uppercase tracking-widest`}
        />
        <p className="text-xs text-muted-foreground">
          Minta kode undangan kepada Kepala Sekolah Anda.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="join-subject" className="text-sm font-medium">
            Mata Pelajaran <span className="font-normal text-muted-foreground">(opsional)</span>
          </label>
          <input
            id="join-subject"
            name="subject"
            type="text"
            maxLength={100}
            placeholder="mis. Matematika"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="join-nip" className="text-sm font-medium">
            NIP <span className="font-normal text-muted-foreground">(opsional)</span>
          </label>
          <input
            id="join-nip"
            name="nip"
            type="text"
            maxLength={50}
            placeholder="mis. 198501012010011001"
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="join-homeroom" className="text-sm font-medium">
          Wali Kelas <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <input
          id="join-homeroom"
          name="homeroomClass"
          type="text"
          maxLength={50}
          placeholder="mis. VII-A (kosongkan bila bukan)"
          className={inputClass}
        />
      </div>
      <SubmitButton label="Gabung ke Sekolah" pendingLabel="Memproses..." />
    </form>
  );
}
