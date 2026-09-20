"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  removeAvatarAction,
  updateAccountEmailAction,
  updateAccountNameAction,
  updateAccountPasswordAction,
  uploadAvatarAction,
  useGoogleAvatarAction,
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * Foto profil di "Data Akun": pratinjau + unggah foto sendiri,
 * pakai foto Google, atau hapus. Foto tampil di top nav.
 */
export function AvatarForm({
  fullName,
  avatarUrl,
  googleAvatarUrl,
  hasCustomAvatar,
  loginWith,
}: {
  fullName: string;
  avatarUrl: string | null;
  googleAvatarUrl: string | null;
  hasCustomAvatar: boolean;
  loginWith: "google" | "email";
}) {
  const [uploadState, uploadAction] = useFormState(uploadAvatarAction, INITIAL);
  useAccountToast(uploadState, "Foto profil tersimpan", "Foto baru tampil di navigasi atas.");
  const [googleState, googleAction] = useFormState(useGoogleAvatarAction, INITIAL);
  useAccountToast(googleState, "Foto Google dipakai", "Foto profil mengikuti Akun Google Anda.");
  const [removeState, removeAction] = useFormState(removeAvatarAction, INITIAL);
  useAccountToast(removeState, "Foto dihapus", "Foto profil sudah dihapus.");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-center justify-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`Foto profil ${fullName}`}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full border object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-700 text-2xl font-bold text-white"
          >
            {initials(fullName)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="text-sm text-muted-foreground">
          {hasCustomAvatar
            ? "Memakai foto yang Anda unggah."
            : avatarUrl
              ? "Memakai foto dari Akun Google."
              : "Belum ada foto — tampil inisial nama."}{" "}
          PNG/JPG/WebP, maksimal 2 MB.
        </p>
        <form action={uploadAction} className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="acc-avatar"
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Pilih & unggah foto
          </label>
          <input
            id="acc-avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="sr-only"
            onChange={(e) => {
              // Langsung kirim begitu berkas dipilih.
              if (e.target.files?.length) {
                e.target.form?.requestSubmit();
              }
            }}
          />
          {loginWith === "google" && googleAvatarUrl && (
            <button
              type="submit"
              formAction={googleAction}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted"
            >
              Pakai foto Google
            </button>
          )}
        </form>
        {uploadState.error && (
          <p role="alert" className="text-sm text-destructive">
            {uploadState.error}
          </p>
        )}
        {googleState.error && (
          <p role="alert" className="text-sm text-destructive">
            {googleState.error}
          </p>
        )}
        {removeState.error && (
          <p role="alert" className="text-sm text-destructive">
            {removeState.error}
          </p>
        )}
        {hasCustomAvatar && (
          <form action={removeAction}>
            <RemoveAvatarSubmit />
          </form>
        )}
      </div>
    </div>
  );
}

function RemoveAvatarSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Menghapus..." : "Hapus foto profil"}
    </button>
  );
}
