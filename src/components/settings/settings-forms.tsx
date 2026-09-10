"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import {
  saveSchoolProfileAction,
  uploadLogoAction,
} from "@/app/(shell)/settings/actions";
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

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
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
      {/* Pertahankan nama agar RPC tidak mengubahnya */}
      <input type="hidden" name="name" value={school.name} />
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
