"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { deleteStudentAction } from "@/app/(shell)/students/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/common";
import { STUDENT_STATUS_LABELS } from "@/lib/students";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import StudentFormDialog from "./student-form-dialog";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

const STATUS_TONES: Record<string, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  graduated: "info",
  transferred: "warning",
  dropped: "neutral",
};

/**
 * Tabel data siswa + tombol Ubah/Hapus per baris.
 * Hapus memakai dialog konfirmasi ramah; hasil tampil sebagai toast.
 */
export default function StudentTable({
  rows,
  defaultYear,
  yearOptions,
  classOptions,
}: {
  rows: Student[];
  defaultYear: string;
  yearOptions: string[];
  classOptions: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Student | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const [deleteState, deleteAction] = useFormState(deleteStudentAction, {
    ok: false,
    error: null,
    message: null,
  });

  const lastDelete = useRef(deleteState);
  useEffect(() => {
    if (lastDelete.current !== deleteState) {
      lastDelete.current = deleteState;
      if (deleteState.error) {
        toast.error("Belum berhasil menghapus", deleteState.error);
      } else if (deleteState.ok) {
        toast.success(
          "Data sudah dihapus",
          deleteState.message ?? undefined
        );
        router.refresh();
      }
    }
  });

  function openEdit(row: Student) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[860px] text-left text-[15px]">
        <thead>
          <tr className="border-b bg-muted/40 text-sm text-muted-foreground">
            <th className="w-12 px-4 py-3 font-semibold">No</th>
            <th className="px-4 py-3 font-semibold">No. Induk</th>
            <th className="px-4 py-3 font-semibold">NISN</th>
            <th className="px-4 py-3 font-semibold">Nama Siswa</th>
            <th className="px-4 py-3 text-center font-semibold">JK</th>
            <th className="px-4 py-3 font-semibold">Agama</th>
            <th className="px-4 py-3 font-semibold">Kelas</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className="border-b transition-colors last:border-0 hover:bg-muted/40"
            >
              <td className="tnum px-4 py-3 text-muted-foreground">{index + 1}</td>
              <td className="tnum whitespace-nowrap px-4 py-3 text-muted-foreground">
                {row.no_induk ?? "—"}
              </td>
              <td className="tnum whitespace-nowrap px-4 py-3 text-muted-foreground">
                {row.student_number ?? "—"}
              </td>
              <td className="px-4 py-3 font-semibold">{row.full_name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                {row.gender === "male" ? "L" : row.gender === "female" ? "P" : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {row.religion ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {row.class_name ? (
                  <Badge tone="info">{row.class_name}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={STATUS_TONES[row.status] ?? "neutral"}>
                  {STUDENT_STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    aria-label={`Ubah data ${row.full_name}`}
                    title="Ubah"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    <span className="ml-1 hidden lg:inline">Ubah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(row)}
                    aria-label={`Hapus data ${row.full_name}`}
                    title="Hapus"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span className="ml-1 hidden lg:inline">Hapus</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={deleteAction} ref={deleteFormRef} className="hidden" aria-hidden>
        <input type="hidden" name="studentId" value={deleting?.id ?? ""} />
      </form>

      <ConfirmDialog
        open={deleting !== null}
        title="Hapus data ini"
        description={
          deleting
            ? `Data ${deleting.full_name}${deleting.class_name ? ` (kelas ${deleting.class_name})` : ""} akan dihapus.\n\nData yang sudah dihapus tidak dapat dikembalikan.`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          // Kirim dulu (nilai input masih id yang dipilih), baru tutup dialog.
          deleteFormRef.current?.requestSubmit();
          setDeleting(null);
        }}
      />

      <StudentFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        row={editing}
        defaultYear={defaultYear}
        yearOptions={yearOptions}
        classOptions={classOptions}
      />
    </div>
  );
}

/** Tombol tambah (dipakai di header halaman) — membuka dialog yang sama. */
export function StudentAddButton({
  defaultYear,
  yearOptions,
  classOptions,
  presetClass,
  label,
  className,
}: {
  defaultYear: string;
  yearOptions: string[];
  classOptions: string[];
  presetClass?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
          className
        )}
      >
        {label ?? "Tambah siswa"}
      </button>
      <StudentFormDialog
        open={open}
        onClose={() => setOpen(false)}
        row={null}
        defaultYear={defaultYear}
        yearOptions={yearOptions}
        classOptions={classOptions}
        presetClass={presetClass}
      />
    </>
  );
}
