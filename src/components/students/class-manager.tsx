"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil, Power, Trash2 } from "lucide-react";
import {
  createSchoolClassAction,
  deleteSchoolClassAction,
  renameSchoolClassAction,
  setSchoolClassActiveAction,
  type StudentActionState,
} from "@/app/(shell)/students/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/common";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import type { SchoolClassWithUsage } from "@/services/school-class.service";

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

const EMPTY_STATE: StudentActionState = { ok: false, error: null, message: null };

function watch(
  prev: MutableRefObject<StudentActionState>,
  next: StudentActionState,
  router: ReturnType<typeof useRouter>,
  successTitle: string
): void {
  if (prev.current !== next) {
    prev.current = next;
    if (next.error) {
      toast.error("Belum berhasil", next.error);
    } else if (next.ok) {
      toast.success(successTitle, next.message ?? undefined);
      router.refresh();
    }
  }
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menambah..." : "Tambah"}
    </button>
  );
}

function SaveRenameButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

/**
 * Daftar Kelas untuk Kepala Sekolah: tambah, ubah nama, nonaktifkan,
 * hapus (ditolak bila masih dipakai — disarankan nonaktifkan saja).
 * Daftar inilah yang menjadi pilihan kelas di seluruh aplikasi.
 */
export default function ClassManager({
  initial,
}: {
  initial: SchoolClassWithUsage[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SchoolClassWithUsage | null>(null);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const [createState, createAction] = useFormState(createSchoolClassAction, EMPTY_STATE);
  const [renameState, renameAction] = useFormState(renameSchoolClassAction, EMPTY_STATE);
  const [toggleState, toggleAction] = useFormState(setSchoolClassActiveAction, EMPTY_STATE);
  const [deleteState, deleteAction] = useFormState(deleteSchoolClassAction, EMPTY_STATE);

  const lastCreate = useRef(createState);
  const lastRename = useRef(renameState);
  const lastToggle = useRef(toggleState);
  const lastDelete = useRef(deleteState);
  // Pola toast-after-action yang sama dipakai di seluruh form aplikasi.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    watch(lastCreate, createState, router, "Kelas ditambah");
    watch(lastRename, renameState, router, "Nama kelas diubah");
    if (lastRename.current !== renameState && renameState.ok) setEditingId(null);
    watch(lastToggle, toggleState, router, "Status kelas diubah");
    watch(lastDelete, deleteState, router, "Kelas dihapus");
  });

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Daftar ini menjadi <strong>pilihan kelas</strong> saat guru mendaftar,
        mengisi kelas yang diajar, dan mengatur wali kelas. Kelas yang masih
        dipakai tidak bisa dihapus — nonaktifkan saja.
      </p>

      <form action={createAction} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          required
          maxLength={50}
          placeholder="Nama kelas baru, mis. I-C"
          aria-label="Nama kelas baru"
          className={inputClass}
        />
        <AddButton />
      </form>

      {initial.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-[15px] text-muted-foreground">
          Belum ada daftar kelas. Tambahkan di atas, mis. I-A sampai VI-B.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {initial.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-xl border bg-card p-3",
                !c.is_active && "opacity-70"
              )}
            >
              {editingId === c.id ? (
                <form action={renameAction} className="flex gap-2">
                  <input type="hidden" name="classId" value={c.id} />
                  <input
                    name="name"
                    required
                    maxLength={50}
                    defaultValue={c.name}
                    aria-label="Nama kelas baru"
                    autoFocus
                    className={inputClass}
                  />
                  <SaveRenameButton />
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="inline-flex min-h-[44px] items-center rounded-lg border px-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    Batal
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      Kelas {c.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {!c.is_active && <Badge tone="neutral">Nonaktif</Badge>}
                      {c.usedIn > 0 ? (
                        <span>Dipakai di {c.usedIn} data</span>
                      ) : (
                        <span>Belum dipakai</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(c.id)}
                    aria-label={`Ubah nama kelas ${c.name}`}
                    title="Ubah nama"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <form action={toggleAction}>
                    <input type="hidden" name="classId" value={c.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={c.is_active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      aria-label={c.is_active ? `Nonaktifkan kelas ${c.name}` : `Aktifkan kelas ${c.name}`}
                      title={c.is_active ? "Nonaktifkan dari pilihan" : "Aktifkan kembali"}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                    >
                      <Power className="h-4 w-4" aria-hidden />
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    aria-label={`Hapus kelas ${c.name}`}
                    title="Hapus"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={deleteAction} ref={deleteFormRef} className="hidden" aria-hidden>
        <input type="hidden" name="classId" value={deleting?.id ?? ""} />
      </form>
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus kelas ini"
        description={
          deleting
            ? `Kelas ${deleting.name} akan dihapus dari daftar pilihan.\n\nData yang sudah dihapus tidak dapat dikembalikan.`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
          setDeleting(null);
        }}
      />
    </div>
  );
}
