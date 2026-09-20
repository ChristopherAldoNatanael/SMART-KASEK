"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import {
  saveSchoolProfileAction,
  uploadLogoAction,
  uploadSignatureAction,
  uploadStampAction,
} from "@/app/(shell)/settings/actions";
import { removeWhiteBackground } from "@/lib/signature-image";
import type { Database } from "@/types/database";

type School = Database["public"]["Tables"]["schools"]["Row"];

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  id,
  label,
  required,
  children,
  hint,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const blocked = pending || disabled;
  return (
    <button
      type="submit"
      disabled={blocked}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function FormMessage({ error, ok }: { error: string | null; ok: boolean }) {
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

export function SchoolProfileForm({ school }: { school: School }) {
  const [state, formAction] = useFormState(saveSchoolProfileAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} ok={state.ok} />
      <Field id="name" label="Nama Satuan Pendidikan" required>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={200}
          defaultValue={school.name}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="npsn" label="NPSN">
          <input
            id="npsn"
            name="npsn"
            type="text"
            maxLength={20}
            defaultValue={school.npsn ?? ""}
            className={inputClass}
          />
        </Field>
        <Field id="phone" label="Telepon">
          <input
            id="phone"
            name="phone"
            type="text"
            maxLength={30}
            defaultValue={school.phone ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field id="address" label="Alamat (Jalan/No)">
        <textarea
          id="address"
          name="address"
          rows={2}
          maxLength={500}
          defaultValue={school.address ?? ""}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="village" label="Desa / Kelurahan">
          <input
            id="village"
            name="village"
            type="text"
            maxLength={100}
            defaultValue={school.village ?? ""}
            className={inputClass}
          />
        </Field>
        <Field id="district" label="Kecamatan">
          <input
            id="district"
            name="district"
            type="text"
            maxLength={100}
            defaultValue={school.district ?? ""}
            className={inputClass}
          />
        </Field>
        <Field id="city" label="Kabupaten / Kota">
          <input
            id="city"
            name="city"
            type="text"
            maxLength={100}
            defaultValue={school.city ?? ""}
            className={inputClass}
          />
        </Field>
        <Field id="province" label="Provinsi">
          <input
            id="province"
            name="province"
            type="text"
            maxLength={100}
            defaultValue={school.province ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field id="email" label="Email Sekolah">
        <input
          id="email"
          name="email"
          type="email"
          maxLength={200}
          defaultValue={school.email ?? ""}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="principalName" label="Nama Kepala Sekolah">
          <input
            id="principalName"
            name="principalName"
            type="text"
            maxLength={200}
            defaultValue={school.principal_name ?? ""}
            className={inputClass}
          />
        </Field>
        <Field id="principalNip" label="NIP Kepala Sekolah">
          <input
            id="principalNip"
            name="principalNip"
            type="text"
            maxLength={50}
            defaultValue={school.principal_nip ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <div>
        <SubmitButton label="Simpan Profil" pendingLabel="Menyimpan…" />
      </div>
    </form>
  );
}

export function SchoolLogoForm({ school }: { school: School }) {
  const [state, formAction] = useFormState(uploadLogoAction, {
    ok: false,
    error: null,
  });
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  const shown = preview ?? school.logo_url;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[#101828] text-sm font-bold text-white">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt="Logo sekolah"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            "SK"
          )}
        </span>
        <p className="text-sm text-muted-foreground">
          Logo tampil di sidebar seluruh warga sekolah. PNG/JPG/WebP/SVG,
          maksimal 2 MB.
        </p>
      </div>
      <form action={formAction} className="space-y-3">
        <FormMessage error={state.error} ok={state.ok} />
        <Field id="logo" label="Berkas Logo Baru">
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFile}
            className="w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted"
          />
        </Field>
        <SubmitButton label="Unggah Logo" pendingLabel="Mengunggah…" />
      </form>
      <LogoSizeForm school={school} />
    </div>
  );
}

/**
 * Pilih berkas TTD/stempel: background putih dihapus otomatis di browser,
 * hasilnya PNG transparan, pratinjau menampilkan hasil akhirnya.
 */
function useCleanImage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const reqId = useRef(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = ++reqId.current;
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setCleaned(false);
    if (!file) return;
    setBusy(true);
    const result = await removeWhiteBackground(file);
    if (reqId.current !== id) return;
    if (result.cleaned && inputRef.current) {
      // Ganti berkas di input dengan hasil bersih (tetap nama field sama).
      const dt = new DataTransfer();
      dt.items.add(result.file);
      inputRef.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(result.file));
    setCleaned(result.cleaned);
    setBusy(false);
  }

  return { inputRef, preview, busy, cleaned, handleFile };
}

/**
 * Unggah tanda tangan Kepala Sekolah — tampil otomatis di dokumen cetak.
 * Tips: foto/scan di kertas putih polos dengan cahaya rata.
 */
export function SchoolSignatureForm({ school }: { school: School }) {
  const [state, formAction] = useFormState(uploadSignatureAction, {
    ok: false,
    error: null,
  });
  const { inputRef, preview, busy, cleaned, handleFile } = useCleanImage();

  const shown = preview ?? school.signature_url;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="flex h-20 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt="Tanda tangan Kepala Sekolah"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">
              Belum ada
            </span>
          )}
        </span>
        <p className="text-sm text-muted-foreground">
          Tanda tangan tampil otomatis di dokumen cetak. Background putih
          dihapus otomatis menjadi PNG transparan. PNG/JPG/WebP, maksimal 2 MB.
        </p>
      </div>
      <form action={formAction} className="space-y-3">
        <FormMessage error={state.error} ok={state.ok} />
        <Field id="signature" label="Berkas Tanda Tangan Baru">
          <input
            ref={inputRef}
            id="signature"
            name="signature"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
            className="w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted"
          />
          {busy && (
            <p className="text-xs text-muted-foreground">Menghapus background…</p>
          )}
          {!busy && cleaned && (
            <p className="text-xs font-medium text-emerald-700">
              Background sudah dihapus — tinggal TTD-nya. Silakan unggah.
            </p>
          )}
        </Field>
        <SubmitButton
          label={busy ? "Tunggu sebentar…" : "Unggah Tanda Tangan"}
          pendingLabel="Mengunggah…"
          disabled={busy}
        />
      </form>
    </div>
  );
}

/**
 * Unggah stempel sekolah — tampil otomatis di dokumen cetak,
 * menimpa area tanda tangan seperti dokumen kertas.
 */
export function SchoolStampForm({ school }: { school: School }) {
  const [state, formAction] = useFormState(uploadStampAction, {
    ok: false,
    error: null,
  });
  const { inputRef, preview, busy, cleaned, handleFile } = useCleanImage();

  const shown = preview ?? school.stamp_url;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt="Stempel sekolah"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">
              Belum ada
            </span>
          )}
        </span>
        <p className="text-sm text-muted-foreground">
          Stempel tampil otomatis di dokumen cetak, menimpa area tanda
          tangan. Background putih dihapus otomatis menjadi PNG transparan.
          PNG/JPG/WebP, maksimal 2 MB.
        </p>
      </div>
      <form action={formAction} className="space-y-3">
        <FormMessage error={state.error} ok={state.ok} />
        <Field id="stamp" label="Berkas Stempel Baru">
          <input
            ref={inputRef}
            id="stamp"
            name="stamp"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
            className="w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted"
          />
          {busy && (
            <p className="text-xs text-muted-foreground">Menghapus background…</p>
          )}
          {!busy && cleaned && (
            <p className="text-xs font-medium text-emerald-700">
              Background sudah dihapus. Silakan unggah.
            </p>
          )}
        </Field>
        <SubmitButton
          label={busy ? "Tunggu sebentar…" : "Unggah Stempel"}
          pendingLabel="Mengunggah…"
          disabled={busy}
        />
      </form>
    </div>
  );
}

export function LogoSizeForm({ school }: { school: School }) {
  const [state, formAction] = useFormState(saveSchoolProfileAction, {
    ok: false,
    error: null,
  });

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 border-t pt-4"
    >
      {/* Kirim ulang seluruh nilai saat ini: RPC menulis semua kolom,
          jadi field yang tak dikirim akan terhapus (NULL). */}
      <input type="hidden" name="name" value={school.name} />
      <input type="hidden" name="npsn" value={school.npsn ?? ""} />
      <input type="hidden" name="address" value={school.address ?? ""} />
      <input type="hidden" name="village" value={school.village ?? ""} />
      <input type="hidden" name="district" value={school.district ?? ""} />
      <input type="hidden" name="city" value={school.city ?? ""} />
      <input type="hidden" name="province" value={school.province ?? ""} />
      <input type="hidden" name="phone" value={school.phone ?? ""} />
      <input type="hidden" name="email" value={school.email ?? ""} />
      <input
        type="hidden"
        name="principalName"
        value={school.principal_name ?? ""}
      />
      <input
        type="hidden"
        name="principalNip"
        value={school.principal_nip ?? ""}
      />
      <div className="flex-1">
        <FormMessage error={state.error} ok={state.ok} />
        <Field
          id="logoSize"
          label="Ukuran Logo di Sidebar (24–64 px)"
          hint="Tinggi logo dalam piksel."
        >
          <input
            id="logoSize"
            name="logoSize"
            type="number"
            min={24}
            max={64}
            defaultValue={school.logo_size ?? 36}
            className={`${inputClass} w-28`}
          />
        </Field>
      </div>
      <LogoSizeSubmit />
    </form>
  );
}

function LogoSizeSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
    >
      {pending ? "Menyimpan…" : "Simpan Ukuran"}
    </button>
  );
}
