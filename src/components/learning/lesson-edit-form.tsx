"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateLessonPlanAction } from "@/app/(shell)/learning/actions";
import { createClient } from "@/lib/supabase/client";
import type { LessonPlanWithTeacher } from "@/services/lesson.service";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const STATUS_HINTS: Record<string, string> = {
  draft: "Hanya Anda yang melihat. Kepala Sekolah belum bisa melihat.",
  published: "Terlihat Kepala Sekolah dan siap dipakai mengajar.",
  archived: "Arsip — tidak aktif, tetapi riwayat tetap tersimpan.",
};

function fileNameSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan Perubahan"}
    </button>
  );
}

export default function LessonEditForm({
  plan,
  schoolId,
}: {
  plan: LessonPlanWithTeacher;
  schoolId: string;
}) {
  const [state, formAction] = useFormState(updateLessonPlanAction, {
    ok: false,
    error: null,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [status, setStatus] = useState(plan.status);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || uploading) return;
    setUploadError(null);

    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;

    const data = new FormData(form);

    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError("Format berkas harus PDF, Word, PowerPoint, Excel, atau gambar.");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setUploadError("Ukuran berkas maksimal 10 MB.");
        return;
      }
      setUploading(true);
      try {
        const supabase = createClient();
        const path = `${schoolId}/${plan.teacher_id}/${Date.now()}-${fileNameSafe(file.name)}`;
        const { error } = await supabase.storage
          .from("lesson-docs")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);
        data.set("fileUrl", path);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Gagal mengunggah berkas."
        );
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    formAction(data);
    setSubmitting(false);
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="lessonId" value={plan.id} />
      {(state.error || uploadError) && (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {uploadError ?? state.error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Judul Modul <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          defaultValue={plan.title}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium">
            Mata Pelajaran
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            maxLength={100}
            defaultValue={plan.subject ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="className" className="text-sm font-medium">
            Kelas
          </label>
          <input
            id="className"
            name="className"
            type="text"
            maxLength={50}
            defaultValue={plan.class_name ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="semester" className="text-sm font-medium">
            Semester
          </label>
          <input
            id="semester"
            name="semester"
            type="text"
            maxLength={20}
            defaultValue={plan.semester ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Deskripsi / Isi Singkat
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          defaultValue={plan.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="docUrl" className="text-sm font-medium">
            Tautan Dokumen
          </label>
          <input
            id="docUrl"
            name="docUrl"
            type="url"
            maxLength={500}
            defaultValue={plan.doc_url ?? ""}
            placeholder="https://… (kosongkan untuk menghapus)"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="docFile" className="text-sm font-medium">
            Ganti Berkas
          </label>
          <input
            id="docFile"
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            {file
              ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`
              : plan.fileName
                ? `Berkas saat ini: ${plan.fileName}`
                : "Belum ada berkas. Maks 10 MB."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="published">Dipublikasikan</option>
          <option value="archived">Diarsipkan</option>
        </select>
        <p className="text-xs text-muted-foreground">{STATUS_HINTS[status]}</p>
      </div>

      <SubmitButton />
      {uploading && (
        <p role="status" className="text-sm text-muted-foreground">
          Mengunggah berkas…
        </p>
      )}
    </form>
  );
}
