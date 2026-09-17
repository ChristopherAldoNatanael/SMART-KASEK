"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ConfirmDialog } from "./confirm-dialog";
import { toast } from "./toaster";

export type DeleteState = { ok: boolean; error: string | null };

function DeleteTrigger({
  label,
  dialogTitle,
  dialogDescription,
}: {
  label: string;
  dialogTitle: string;
  dialogDescription: string;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          formRef.current = e.currentTarget.form;
          setOpen(true);
        }}
        className="min-h-[44px] px-2 py-2 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
      >
        {pending ? "Menghapus..." : label}
      </button>
      <ConfirmDialog
        open={open}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        tone="danger"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}

/**
 * Generic delete button wired to a server action.
 * Konfirmasi memakai dialog ramah dalam aplikasi (bukan popup browser),
 * kegagalan tampil sebagai toast. API tidak berubah.
 */
export default function DeleteButton({
  action,
  idName,
  idValue,
  label = "Hapus",
  confirmText = "Hapus data ini? Tindakan tidak dapat dibatalkan.",
}: {
  action: (
    prev: DeleteState,
    formData: FormData
  ) => Promise<DeleteState>;
  idName: string;
  idValue: string;
  label?: string;
  confirmText?: string;
}) {
  const [state, formAction] = useFormState(action, {
    ok: false,
    error: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menghapus", state.error);
      }
    }
  });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name={idName} value={idValue} />
        <DeleteTrigger
          label={label}
          dialogTitle={`${label} data ini`}
          dialogDescription={`${confirmText}\n\nData yang sudah dihapus tidak dapat dikembalikan.`}
        />
      </form>
    </span>
  );
}
