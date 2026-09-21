"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updateCertificationAction } from "@/app/(shell)/teachers/actions";
import { toast } from "@/components/toaster";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan…" : "Simpan Sertifikasi"}
    </button>
  );
}

/**
 * Form sertifikasi guru — khusus Kepala Sekolah.
 * Jenis sertifikasi diketik manual (sistem tidak menentukan otomatis).
 * Status "Belum Sertifikasi" menyembunyikan field jenis & tahun.
 */
export default function CertificationForm({
  teacherId,
  status,
  type,
  year,
}: {
  teacherId: string;
  status: string;
  type: string | null;
  year: number | null;
}) {
  const [state, formAction] = useFormState(updateCertificationAction, {
    ok: false,
    error: null,
  });
  const router = useRouter();
  const [, startTransition] = useTransition();
  const last = useRef(state);
  const [selected, setSelected] = useState(status === "sudah" ? "sudah" : "belum");

  // Hasil simpan tampil sebagai toast (jelas terlihat), lalu badge
  // status di halaman dimuat ulang agar langsung sesuai data baru.
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success(
          "Data sertifikasi tersimpan",
          selected === "sudah"
            ? "Status guru sudah diperbarui menjadi Sudah Sertifikasi."
            : "Status guru sudah diperbarui menjadi Belum Sertifikasi."
        );
        startTransition(() => router.refresh());
      }
    }
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="teacherId" value={teacherId} />

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted-foreground">
          Status Sertifikasi
        </legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="status"
              value="belum"
              checked={selected === "belum"}
              onChange={() => setSelected("belum")}
              className="h-4 w-4 accent-primary"
            />
            Belum Sertifikasi
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="status"
              value="sudah"
              checked={selected === "sudah"}
              onChange={() => setSelected("sudah")}
              className="h-4 w-4 accent-primary"
            />
            Sudah Sertifikasi
          </label>
        </div>
      </fieldset>

      {selected === "sudah" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div className="space-y-1.5">
            <label
              htmlFor="cert-type"
              className="text-xs font-medium text-muted-foreground"
            >
              Jenis Sertifikasi <span className="text-destructive">*</span>
            </label>
            <input
              id="cert-type"
              name="type"
              type="text"
              maxLength={150}
              required={selected === "sudah"}
              defaultValue={type ?? ""}
              placeholder="mis. Sertifikasi Guru"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="cert-year"
              className="text-xs font-medium text-muted-foreground"
            >
              Tahun Sertifikasi
            </label>
            <input
              id="cert-year"
              name="year"
              type="number"
              min={1945}
              max={2100}
              defaultValue={year ?? ""}
              placeholder="mis. 2023"
              className={`${inputClass} tnum`}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Sertifikasi adalah data profil guru — bukan kegiatan pelatihan.
      </p>
      <SubmitButton />
    </form>
  );
}
