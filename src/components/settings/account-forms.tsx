"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateAccountEmailAction,
  updateAccountNameAction,
  updateAccountPasswordAction,
  type SettingsActionState,
} from "@/app/(shell)/settings/actions";
import { toast } from "@/components/toaster";

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

const INITIAL: SettingsActionState = { ok: false, error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

function useAccountToast(state: SettingsActionState, successTitle: string, successDesc?: string) {
  const router = useRouter();
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success(successTitle, successDesc);
        router.refresh();
      }
    }
  });
}

/** Ubah nama lengkap sendiri. */
export function AccountNameForm({ initialName }: { initialName: string }) {
  const [state, formAction] = useFormState(updateAccountNameAction, INITIAL);
  useAccountToast(state, "Nama tersimpan", "Nama Anda sudah diperbarui.");

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="acc-nama" className="text-[15px] font-semibold">
          Nama lengkap
        </label>
        <input
          id="acc-nama"
          name="fullName"
          required
          minLength={3}
          maxLength={200}
          defaultValue={initialName}
          placeholder="Nama lengkap Anda"
          autoComplete="name"
          className={inputClass}
        />
      </div>
      <SubmitButton label="Simpan nama" />
    </form>
  );
}

/** Ubah email sendiri. */
export function AccountEmailForm({ initialEmail }: { initialEmail: string }) {
  const [state, formAction] = useFormState(updateAccountEmailAction, INITIAL);
  useAccountToast(
    state,
    "Email tersimpan",
    "Bila verifikasi email aktif, tautan konfirmasi dikirim ke alamat baru. Sampai dikonfirmasi, masuk tetap memakai email lama."
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="acc-email" className="text-[15px] font-semibold">
          Email
        </label>
        <input
          id="acc-email"
          name="email"
          type="email"
          required
          maxLength={200}
          defaultValue={initialEmail}
          placeholder="nama@sekolah.sch.id"
          autoComplete="email"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Email dipakai untuk masuk ke aplikasi.
        </p>
      </div>
      <SubmitButton label="Simpan email" />
    </form>
  );
}

/** Ganti kata sandi sendiri. */
export function AccountPasswordForm() {
  const [state, formAction] = useFormState(updateAccountPasswordAction, INITIAL);
  useAccountToast(state, "Kata sandi diganti", "Masuk berikutnya memakai kata sandi baru.");

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="acc-pass" className="text-[15px] font-semibold">
            Kata sandi baru
          </label>
          <input
            id="acc-pass"
            name="password"
            type="password"
            required
            minLength={6}
            maxLength={100}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="acc-pass2" className="text-[15px] font-semibold">
            Ulangi kata sandi baru
          </label>
          <input
            id="acc-pass2"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            maxLength={100}
            placeholder="Ketik ulang"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      </div>
      <SubmitButton label="Ganti kata sandi" />
    </form>
  );
}
