"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { FileText, Link, Upload } from "lucide-react";
import {
  addActionAction,
  updateActionAction,
  updateSessionStatusAction,
  type CoachingActionState,
} from "@/app/(shell)/coaching/actions";
import { toast } from "@/components/toaster";
import type { CoachingSessionWithDetails } from "@/services/coaching.service";
import {
  parseEvidence,
  type EvidenceData,
  type EvidenceType,
} from "@/lib/evidence-parser";

type ActionRow = CoachingSessionWithDetails["actions"][number];

export type CoachingViewerRole = "teacher" | "principal" | "admin";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/** Kirim hasil action sebagai pop-up toast (sekali per submit). */
function useActionToast(state: CoachingActionState, successTitle: string) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Gagal menyimpan", state.error);
      } else if (state.ok) {
        toast.success(successTitle);
        startTransition(() => router.refresh());
      }
    }
  });
}

export function SessionStatusForm({
  sessionId,
  current,
}: {
  sessionId: string;
  current: string;
}) {
  const [state, formAction] = useFormState(updateSessionStatusAction, {
    ok: false,
    error: null,
  });
  useActionToast(state, "Status sesi diperbarui.");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-64">
          <label htmlFor="session-status" className="text-sm font-medium">
            Ubah Status Sesi
          </label>
          <select
            id="session-status"
            name="status"
            defaultValue={current}
            className={inputClass}
          >
            <option value="scheduled">Terjadwal</option>
            <option value="in_progress">Berlangsung</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <SubmitButton label="Simpan Status" pendingLabel="Menyimpan..." />
      </div>
    </form>
  );
}

export function AddActionForm({ sessionId }: { sessionId: string }) {
  const [state, formAction] = useFormState(addActionAction, {
    ok: false,
    error: null,
  });
  useActionToast(state, "Tindak lanjut ditambahkan.");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="space-y-2">
        <label htmlFor="new-action" className="text-sm font-medium">
          Tindakan Baru <span className="text-destructive">*</span>
        </label>
        <input
          id="new-action"
          name="action"
          type="text"
          required
          minLength={3}
          maxLength={500}
          placeholder="mis. Menyusun rubrik asesmen formatif"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-56">
          <label htmlFor="new-action-date" className="text-sm font-medium">
            Target Tanggal
          </label>
          <input
            id="new-action-date"
            name="targetDate"
            type="date"
            className={inputClass}
          />
        </div>
        <SubmitButton label="Tambah Tindak Lanjut" pendingLabel="Menambahkan..." />
      </div>
    </form>
  );
}

/**
 * Form progres tindak lanjut. Guru (miliknya) melaporkan status +
 * bukti + hasil + catatan; Kepala Sekolah memakai form yang sama.
 * Bukti support: teks, link Google Drive, atau upload file.
 */
export function UpdateActionForm({
  action,
  sessionId,
  viewerRole,
}: {
  action: ActionRow;
  sessionId: string;
  viewerRole: CoachingViewerRole;
}) {
  const [state, formAction] = useFormState(updateActionAction, {
    ok: false,
    error: null,
  });
  const [status, setStatus] = useState<string>(action.status);
  const isTeacher = viewerRole === "teacher";
  const isPrincipal = viewerRole === "principal";

  useActionToast(
    state,
    isTeacher
      ? "Laporan terkirim. Perkembangan Anda sedang diperbarui."
      : "Progres tersimpan."
  );

  // Parse existing evidence
  const existingEvidence = parseEvidence(action.evidence);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(
    existingEvidence?.type ?? "text"
  );
  const [evidenceValue, setEvidenceValue] = useState<string>(
    existingEvidence?.value ?? ""
  );
  const [evidenceFileName, setEvidenceFileName] = useState<string>(
    existingEvidence?.fileName ?? ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Build JSON for form submission
  const evidenceJson = JSON.stringify({
    type: evidenceType,
    value: evidenceType === "file" && evidenceFileName ? evidenceFileName : evidenceValue,
    ...(evidenceType === "file" && evidenceFileName ? { fileName: evidenceFileName } : {}),
  });

  const evidenceRequired = status === "completed";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10 MB");
      return;
    }

    setSelectedFile(file);
    setEvidenceFileName(file.name);
  }

  function handleEvidenceTypeChange(type: EvidenceType) {
    setEvidenceType(type);
    setSelectedFile(null);
    if (type !== "file") {
      setEvidenceFileName("");
    }
  }

  return (
    <form
      action={async (formData: FormData) => {
        if (selectedFile && evidenceType === "file") {
          setIsUploading(true);
          try {
            // Upload file first via server action
            formData.append("evidenceFile", selectedFile);
          } catch (error) {
            toast.error("Gagal mengunggah file");
            setIsUploading(false);
            return;
          }
        }
        setIsUploading(false);
        return formAction(formData);
      }}
      className="mt-3 space-y-3 border-t pt-3"
      encType="multipart/form-data"
    >
      <input type="hidden" name="actionId" value={action.id} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="evidence" value={evidenceJson} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={`status-${action.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <select
            id={`status-${action.id}`}
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="pending">Menunggu</option>
            <option value="in_progress">Berlangsung</option>
            <option value="completed">Selesai</option>
            {isPrincipal && <option value="cancelled">Dibatalkan</option>}
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`result-${action.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Hasil
          </label>
          <input
            id={`result-${action.id}`}
            name="result"
            type="text"
            defaultValue={action.result ?? ""}
            maxLength={2000}
            placeholder={isTeacher ? "Apa yang sudah dikerjakan?" : "Hasil yang dicapai"}
            className={inputClass}
          />
        </div>
      </div>

      {/* Evidence Section with Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Bukti {evidenceRequired && <span className="text-destructive">*</span>}
        </label>

        {/* Type Tabs */}
        <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => handleEvidenceTypeChange("text")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              evidenceType === "text"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Teks
          </button>
          <button
            type="button"
            onClick={() => handleEvidenceTypeChange("link")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              evidenceType === "link"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link className="h-3.5 w-3.5" />
            Link
          </button>
          <button
            type="button"
            onClick={() => handleEvidenceTypeChange("file")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              evidenceType === "file"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            File
          </button>
        </div>

        {/* Evidence Input based on type */}
        {evidenceType === "text" && (
          <textarea
            id={`evidence-text-${action.id}`}
            value={evidenceValue}
            onChange={(e) => setEvidenceValue(e.target.value)}
            rows={2}
            maxLength={5000}
            placeholder={
              isTeacher
                ? "Ceritakan apa yang sudah Anda lakukan..."
                : "Catatan bukti..."
            }
            className={inputClass}
          />
        )}

        {evidenceType === "link" && (
          <div className="space-y-1">
            <input
              id={`evidence-link-${action.id}`}
              type="url"
              value={evidenceValue}
              onChange={(e) => setEvidenceValue(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className={inputClass}
            />
          </div>
        )}

        {evidenceType === "file" && (
          <div className="space-y-2">
            <div className="rounded-md border border-dashed bg-muted/20 p-3">
              <input
                id={`evidence-file-${action.id}`}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,.txt"
                className="hidden"
              />
              <label
                htmlFor={`evidence-file-${action.id}`}
                className="flex cursor-pointer flex-col items-center gap-2 text-center"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                {selectedFile ? (
                  <span className="text-sm font-medium text-foreground">
                    {selectedFile.name}
                  </span>
                ) : evidenceFileName ? (
                  <span className="text-sm font-medium text-foreground">
                    {evidenceFileName}
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-foreground">
                      Klik untuk pilih file
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PDF, DOCX, gambar (JPG/PNG), atau teks. Maks 10 MB
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {evidenceRequired && !evidenceValue && !selectedFile && (
          <p className="text-[11px] text-destructive">
            Bukti wajib diisi sebelum menandai Selesai.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`notes-${action.id}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Catatan
        </label>
        <input
          id={`notes-${action.id}`}
          name="notes"
          type="text"
          defaultValue={action.notes ?? ""}
          maxLength={2000}
          placeholder={isTeacher ? "Catatan tambahan (opsional)" : "Catatan verifikasi"}
          className={inputClass}
        />
      </div>
      <SubmitButton
        label={isTeacher ? "Kirim Laporan" : isPrincipal ? "Simpan Verifikasi" : "Simpan"}
        pendingLabel={isUploading ? "Mengunggah..." : "Menyimpan..."}
      />
    </form>
  );
}
