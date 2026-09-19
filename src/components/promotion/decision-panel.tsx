"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  decidePromotionAction,
  reopenPromotionAction,
  returnPromotionAction,
} from "@/app/(shell)/kenaikan-kelas/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { PromotionDecision } from "@/lib/promotion";
import { toast } from "@/components/toaster";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

type TriState = { ok: boolean; error: string | null; message: string | null };
const INITIAL: TriState = { ok: false, error: null, message: null };

function usePromotionToast(
  state: TriState,
  successTitle: string
): void {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil", state.error);
      } else if (state.ok) {
        toast.success(successTitle, state.message ?? undefined);
        startTransition(() => router.refresh());
      }
    }
  });
}

/**
 * Tombol keputusan final Kepala Sekolah: Naik / Tidak Naik + catatan
 * opsional, selalu lewat dialog konfirmasi.
 */
export function DecisionButtons({
  decisionId,
  studentName,
}: {
  decisionId: string;
  studentName: string;
}) {
  const [pendingDecision, setPendingDecision] = useState<PromotionDecision | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(decidePromotionAction, INITIAL);
  usePromotionToast(state, "Keputusan ditetapkan");

  function ask(decision: PromotionDecision) {
    setPendingDecision(decision);
    setOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="dec-note" className="text-[15px] font-semibold">
          Catatan Kepala Sekolah{" "}
          <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea
          id="dec-note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Alasan atau pesan untuk wali kelas dan arsip..."
          className={inputClass}
        />
      </div>
      <form action={formAction} ref={formRef} className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="decisionId" value={decisionId} />
        <input type="hidden" name="decision" value={pendingDecision ?? ""} />
        <input type="hidden" name="note" value={note} />
        <DecideButton
          label="Tetapkan Naik Kelas"
          primary
          onClick={() => ask("naik")}
        />
        <DecideButton label="Tetapkan Tidak Naik" onClick={() => ask("tidak_naik")} />
      </form>
      <ConfirmDialog
        open={open && pendingDecision !== null}
        title={`Tetapkan ${pendingDecision === "naik" ? "Naik Kelas" : "Tidak Naik Kelas"}`}
        description={`Keputusan untuk ${studentName} akan ditetapkan final dan bisa dilihat wali kelas. Setelah ini tidak bisa diubah, kecuali dibuka kembali secara resmi.`}
        confirmLabel="Tetapkan"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}

function DecideButton({
  label,
  primary,
  onClick,
}: {
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={
        primary
          ? "inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          : "inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      }
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

function NoteConfirmButton({
  label,
  onOpen,
  disabled,
}: {
  label: string;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onOpen}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

/** Kembalikan ke wali kelas — alasan wajib diisi. */
export function ReturnForm({
  decisionId,
  studentName,
}: {
  decisionId: string;
  studentName: string;
}) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(returnPromotionAction, INITIAL);
  usePromotionToast(state, "Dikembalikan ke wali kelas");

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={`ret-note-${decisionId}`} className="text-[15px] font-semibold">
          Alasan pengembalian <span className="text-destructive">* wajib diisi</span>
        </label>
        <textarea
          id={`ret-note-${decisionId}`}
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: lengkapi catatan perkembangan untuk 2 siswa berikut..."
          className={inputClass}
        />
      </div>
      <form action={formAction} ref={formRef}>
        <input type="hidden" name="decisionId" value={decisionId} />
        <input type="hidden" name="note" value={note} />
        <NoteConfirmButton
          label="Kembalikan ke wali kelas"
          onOpen={() => setOpen(true)}
          disabled={note.trim() === ""}
        />
      </form>
      <ConfirmDialog
        open={open}
        title="Kembalikan ke wali kelas"
        description={`Rekomendasi ${studentName} dikembalikan beserta alasan untuk diperbaiki wali kelas.`}
        confirmLabel="Kembalikan"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}

/** Buka kembali keputusan final — alasan wajib, tercatat di audit. */
export function ReopenButton({
  decisionId,
  studentName,
}: {
  decisionId: string;
  studentName: string;
}) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(reopenPromotionAction, INITIAL);
  usePromotionToast(state, "Keputusan dibuka kembali");

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={`reo-note-${decisionId}`} className="text-[15px] font-semibold">
          Alasan pembukaan kembali <span className="text-destructive">* wajib diisi</span>
        </label>
        <textarea
          id={`reo-note-${decisionId}`}
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: ada data kehadiran susulan yang belum masuk..."
          className={inputClass}
        />
      </div>
      <form action={formAction} ref={formRef}>
        <input type="hidden" name="decisionId" value={decisionId} />
        <input type="hidden" name="note" value={note} />
        <NoteConfirmButton
          label="Buka kembali keputusan"
          onOpen={() => setOpen(true)}
          disabled={note.trim() === ""}
        />
      </form>
      <ConfirmDialog
        open={open}
        title="Buka kembali keputusan"
        description={`Keputusan final ${studentName} akan dibuka dan dikembalikan ke wali kelas. Riwayat perubahan tetap tercatat.`}
        confirmLabel="Buka kembali"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
