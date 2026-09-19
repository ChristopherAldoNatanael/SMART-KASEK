"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { bulkDeleteStudentsAction } from "@/app/(shell)/students/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

export type BulkClassOption = {
  name: string | null;
  total: number;
};

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function keyOf(name: string | null): string {
  return name ?? "";
}

function labelOf(name: string | null): string {
  return name ? `Kelas ${name}` : "Tanpa kelas";
}

function DeleteSubmitButton({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      onClick={(e) => {
        // Jangan langsung kirim — tampilkan dialog final dulu.
        e.preventDefault();
        onConfirm();
      }}
      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-destructive px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menghapus..." : "Hapus permanen"}
    </button>
  );
}

/**
 * Hapus massal per kelas dalam 1 tahun ajaran (Kepala Sekolah).
 * Sengaja dibuat berlapis agar tidak kepencet:
 * 1) centang kelas → 2) ketik ulang JUMLAH siswa → 3) centang
 * persetujuan → 4) dialog final. Server menghitung ulang dan
 * menolak bila data sudah berubah sejak layar dibuka.
 */
export default function BulkDeleteClasses({
  academicYear,
  classes,
}: {
  academicYear: string;
  classes: BulkClassOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<"pilih" | "konfirmasi">("pilih");
  const [selected, setSelected] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [acked, setAcked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [state, formAction] = useFormState(bulkDeleteStudentsAction, {
    ok: false,
    error: null,
    message: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menghapus", state.error);
      } else if (state.ok) {
        toast.success("Data terhapus", state.message ?? undefined);
        resetAll();
        startTransition(() => router.refresh());
      }
    }
  });

  function resetAll() {
    setStep("pilih");
    setSelected([]);
    setTyped("");
    setAcked(false);
    setConfirmOpen(false);
  }

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.length === classes.length ? [] : classes.map((c) => keyOf(c.name))
    );
  }

  const total = classes
    .filter((c) => selected.includes(keyOf(c.name)))
    .reduce((a, c) => a + c.total, 0);
  const typedOk = typed.trim() !== "" && Number(typed.trim()) === total;
  const canSubmit = total > 0 && typedOk && acked;

  const classesJson = JSON.stringify(selected);

  if (classes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-[15px] text-muted-foreground">
        Tidak ada kelas pada tahun {academicYear} untuk dihapus.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 text-[15px] leading-relaxed">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <p>
          <strong>Hati-hati:</strong> yang dihapus adalah{" "}
          <strong>data siswa</strong> pada tahun ajaran {academicYear} saja
          (tahun lain tidak tersentuh). Data yang dihapus{" "}
          <strong>tidak bisa dikembalikan</strong>.
        </p>
      </div>

      {step === "pilih" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] font-bold">Langkah 1 — Pilih kelas</p>
            <button
              type="button"
              onClick={toggleAll}
              className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
            >
              {selected.length === classes.length ? "Batalkan semua" : "Pilih semua"}
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {classes.map((c) => {
              const key = keyOf(c.name);
              const on = selected.includes(key);
              return (
                <li key={key || "__none__"}>
                  <label
                    className={cn(
                      "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors",
                      on
                        ? "border-destructive bg-destructive/[0.04]"
                        : "border-border bg-card hover:border-destructive/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(key)}
                      className="h-5 w-5 shrink-0 accent-red-700"
                    />
                    <span className="flex-1 text-[15px] font-semibold">
                      {labelOf(c.name)}
                    </span>
                    <span className="tnum text-sm text-muted-foreground">
                      {c.total} siswa
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <p className="tnum text-[15px]" role="status">
              Dipilih: <strong>{selected.length} kelas</strong>,{" "}
              <strong>{total} siswa</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setTyped("");
                setAcked(false);
                setStep("konfirmasi");
              }}
              disabled={total === 0}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-destructive px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
            >
              Lanjut
            </button>
          </div>
        </>
      ) : (
        <form action={formAction} ref={formRef} className="space-y-4">
          <input type="hidden" name="academicYear" value={academicYear} />
          <input type="hidden" name="classesJson" value={classesJson} />
          <input type="hidden" name="expectedTotal" value={total} />

          <div className="rounded-xl border-2 border-destructive/40 bg-card p-4">
            <p className="text-[15px] font-bold">
              Langkah 2 — Periksa sekali lagi
            </p>
            <p className="tnum mt-2 text-lg leading-relaxed">
              Akan dihapus:{" "}
              <strong>
                {total} siswa
              </strong>{" "}
              dari{" "}
              <strong>
                {selected.length} kelas
              </strong>{" "}
              ({selected.map((k) => (k ? `Kelas ${k}` : "Tanpa kelas")).join(", ")})
              — tahun {academicYear}.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bd-total" className="text-[15px] font-semibold">
              Langkah 3 — Ketik angka <span className="tnum">{total}</span> di bawah ini
            </label>
            <input
              id="bd-total"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={`Ketik ${total} untuk melanjutkan`}
              maxLength={7}
              className={cn(inputClass, "max-w-64")}
            />
            {typed.trim() !== "" && !typedOk && (
              <p role="alert" className="text-sm font-medium text-destructive">
                Angka belum sama dengan {total}.
              </p>
            )}
          </div>

          <label className="flex min-h-[48px] cursor-pointer items-start gap-2.5 text-[15px] leading-relaxed">
            <input
              type="checkbox"
              checked={acked}
              onChange={(e) => setAcked(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-red-700"
            />
            Saya paham data yang dihapus tidak bisa dikembalikan.
          </label>

          <div className="flex flex-col items-stretch gap-2">
            <button
              type="button"
              onClick={() => setStep("pilih")}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted"
            >
              Kembali
            </button>
            <DeleteSubmitButton
              disabled={!canSubmit}
              onConfirm={() => setConfirmOpen(true)}
            />
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus permanen sekarang"
        description={`Terakhir: ${total} siswa dari ${selected.length} kelas (tahun ${academicYear}) akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="Ya, hapus permanen"
        cancelLabel="Jangan hapus"
        tone="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
