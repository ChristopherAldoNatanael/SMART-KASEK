"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { deleteTeacherAction } from "@/app/(shell)/teachers/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toaster";

function DeleteTrigger({
  teacherName,
  onOpen,
}: {
  teacherName: string;
  onOpen: (form: HTMLFormElement | null) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => onOpen(e.currentTarget.form)}
      aria-label={`Hapus ${teacherName} dari daftar guru`}
      className="min-h-[44px] px-1 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}

/**
 * Tombol Hapus di kolom Aksi daftar guru (Kepala Sekolah).
 * Dialog menjelaskan dampak permanen + alternatif Nonaktif;
 * hasil tampil sebagai toast.
 */
export default function TeacherDeleteButton({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState(deleteTeacherAction, {
    ok: false,
    error: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menghapus", state.error);
      } else if (state.ok) {
        toast.success(
          "Data guru dihapus",
          `${teacherName} sudah dihapus dari daftar.`
        );
        router.refresh();
      }
    }
  });

  return (
    <span className="inline-flex items-center">
      <form action={formAction} ref={formRef}>
        <input type="hidden" name="teacherId" value={teacherId} />
        <DeleteTrigger teacherName={teacherName} onOpen={(form) => {
          formRef.current = form;
          setOpen(true);
        }} />
      </form>
      <ConfirmDialog
        open={open}
        title={`Hapus ${teacherName}`}
        description={`Guru ini akan dihapus dari daftar sekolah.\n\nData supervisi, coaching, dan nilainya ikut terhapus permanen dan tidak bisa dikembalikan.\n\nJika hanya pindah sementara, gunakan Nonaktif saja.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        tone="danger"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </span>
  );
}
