"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { finalizeManagerialOverallAction } from "@/app/(shell)/supervision/manajerial/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toaster";

function FinalizeTrigger({
  onOpen,
  registerForm,
}: {
  onOpen: () => void;
  registerForm: (form: HTMLFormElement | null) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        registerForm(e.currentTarget.form);
        onOpen();
      }}
      className="min-h-[48px] rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Memfinalisasi..." : "Finalisasi nilai akhir"}
    </button>
  );
}

/** Tombol finalisasi keseluruhan (wajib I1 + I2 + I3 final). */
export default function ManagerialFinalizeButton({
  supervisionId,
}: {
  supervisionId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(finalizeManagerialOverallAction, {
    ok: false,
    error: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum bisa difinalisasi", state.error);
      } else if (state.ok) {
        toast.success(
          "Supervisi manajerial sudah final",
          "Nilai akhir sudah tersimpan dan dapat dilihat guru di daftar serta dashboard."
        );
        router.refresh();
      }
    }
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="supervisionId" value={supervisionId} />
      <FinalizeTrigger
        onOpen={() => setOpen(true)}
        registerForm={(form) => {
          formRef.current = form;
        }}
      />
      <ConfirmDialog
        open={open}
        title="Finalisasi Nilai Akhir"
        description="Nilai akhir dihitung otomatis dari rata-rata Instrumen 1, 2, dan 3.\n\nSetelah finalisasi, hasil dapat dilihat oleh guru yang bersangkutan."
        confirmLabel="Finalisasi"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
