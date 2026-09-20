"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowLeftRight, LogOut } from "lucide-react";
import {
  chooseRoleAction,
  createSchoolAction,
  getJoinSchoolInfoAction,
  joinSchoolAction,
  switchRoleAction,
} from "@/app/onboarding/actions";
import { logout } from "@/lib/auth/actions";

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

type JoinLookup =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; schoolName: string; classes: string[] }
  | { status: "notfound" };

export function JoinSchoolForm() {
  const [state, formAction] = useFormState(joinSchoolAction, {
    ok: false,
    error: null,
  });
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<JoinLookup>({ status: "idle" });
  const [taught, setTaught] = useState<string[]>([]);

  // Ketik kode → cari sekolah + daftar kelasnya (untuk dropdown).
  useEffect(() => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setLookup({ status: "idle" });
      return;
    }
    setLookup({ status: "checking" });
    let cancelled = false;
    const t = setTimeout(async () => {
      const result = await getJoinSchoolInfoAction(clean);
      if (cancelled) return;
      if (result.ok && result.schoolName) {
        setLookup({
          status: "found",
          schoolName: result.schoolName,
          classes: result.classes,
        });
      } else {
        setLookup({ status: "notfound" });
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [code]);

  // Pilihan kelas yang dicentang harus selalu dari daftar terbaru.
  const lookupClasses = lookup.status === "found" ? lookup.classes : [];
  const taughtValid = taught.filter((c) => lookupClasses.includes(c));

  function toggleTaught(cls: string) {
    setTaught((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  }

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
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="mis. A7K2P9QX"
          autoComplete="off"
          className={`${inputClass} uppercase tracking-widest`}
        />
        {lookup.status === "checking" && (
          <p role="status" className="text-xs text-muted-foreground">
            Mengecek kode...
          </p>
        )}
        {lookup.status === "found" && (
          <p role="status" className="rounded-md bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
            Sekolah ditemukan: {lookup.schoolName}
          </p>
        )}
        {lookup.status === "notfound" && (
          <p role="alert" className="rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            Kode tidak ditemukan. Periksa kembali kode dari Kepala Sekolah.
          </p>
        )}
        {lookup.status === "idle" && (
          <p className="text-xs text-muted-foreground">
            Minta kode undangan kepada Kepala Sekolah Anda.
          </p>
        )}
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
        {lookupClasses.length > 0 ? (
          <select id="join-homeroom" name="homeroomClass" className={inputClass} defaultValue="">
            <option value="">Bukan wali kelas</option>
            {lookupClasses.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              id="join-homeroom"
              name="homeroomClass"
              type="text"
              maxLength={50}
              placeholder="mis. I-A (kosongkan bila bukan)"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">
              Kepala Sekolah bisa mengubahnya nanti.
            </p>
          </>
        )}
      </div>
      {lookupClasses.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Kelas yang diajar{" "}
            <span className="font-normal text-muted-foreground">
              (boleh lebih dari satu, opsional)
            </span>
          </legend>
          <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-md border p-2.5">
            {lookupClasses.map((c) => (
              <label
                key={c}
                className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={taughtValid.includes(c)}
                  onChange={() => toggleTaught(c)}
                  className="h-5 w-5 accent-emerald-700"
                />
                Kelas {c}
              </label>
            ))}
          </div>
          <input
            type="hidden"
            name="taughtClassesJson"
            value={JSON.stringify(taughtValid)}
          />
        </fieldset>
      )}
      <SubmitButton label="Gabung ke Sekolah" pendingLabel="Memproses..." />
    </form>
  );
}

/**
 * Koreksi peran saat onboarding (salah pilih Guru / Kepala Sekolah).
 * Hanya tampil sebelum profil terhubung ke sekolah — setelah itu
 * RPC menolak (ALREADY_LINKED) demi keamanan otorisasi.
 */
export function SwitchRolePanel({
  currentRole,
}: {
  currentRole: "principal" | "teacher";
}) {
  const [state, formAction] = useFormState(switchRoleAction, {
    ok: false,
    error: null,
  });
  const [open, setOpen] = useState(false);
  const other = currentRole === "principal" ? "teacher" : "principal";

  return (
    <div className="mt-6 rounded-lg border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Peran saat ini: </span>
          <strong>
            {currentRole === "principal" ? "Kepala Sekolah" : "Guru"}
          </strong>
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          {open ? "Tutup" : "Salah pilih peran?"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <FormError error={state.error} />
          <form action={formAction}>
            <button
              type="submit"
              name="role"
              value={other}
              className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-muted/50"
            >
              <p className="text-sm font-semibold">
                Ganti menjadi{" "}
                {other === "principal" ? "Kepala Sekolah" : "Guru"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {other === "principal"
                  ? "Anda akan membuat sekolah baru dan menerima kode undangan."
                  : "Anda akan bergabung ke sekolah memakai kode undangan."}
              </p>
            </button>
          </form>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              atau keluar dan daftar ulang dengan email lain
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
