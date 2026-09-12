"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Loader2,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteSupervisionDocumentAction,
  saveSupervisionDocumentAction,
} from "@/app/(shell)/supervision/documents-actions";
import {
  SUPERVISION_DOC_LABELS,
  SUPERVISION_DOC_MAX_BYTES,
  SUPERVISION_DOC_TYPES,
  type SupervisionDocType,
} from "@/lib/supervision-docs";
import type { SupervisionDocumentWithUrl } from "@/services/supervision-documents.service";
import { Badge } from "@/components/common";
import { cn } from "@/lib/utils";

const ACCEPT = ".docx,.doc,.pdf";
const ALLOWED_MIMES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/pdf",
];

function fileNameSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isDocx(mime: string, name: string): boolean {
  return (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.toLowerCase().endsWith(".docx")
  );
}

export default function SupervisionDocuments({
  supervisionId,
  schoolId,
  canUpload,
  viewerRole,
  initialDocs,
}: {
  supervisionId: string;
  schoolId: string;
  canUpload: boolean;
  viewerRole: "principal" | "teacher" | "admin";
  initialDocs: SupervisionDocumentWithUrl[];
}) {
  const router = useRouter();
  const [pendingDoc, setPendingDoc] = useState<SupervisionDocType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<Partial<Record<SupervisionDocType, HTMLInputElement | null>>>({});

  const byType = useMemo(() => {
    const map = new Map<string, SupervisionDocumentWithUrl>();
    for (const d of initialDocs) map.set(d.doc_type, d);
    return map;
  }, [initialDocs]);

  const doneCount = byType.size;

  async function handleFile(docType: SupervisionDocType, file: File | undefined) {
    if (!file || pendingDoc) return;
    setError(null);

    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["docx", "doc", "pdf"].includes(ext) || !ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
      // Izinkan docx tanpa MIME jelas dari browser lama via ekstensi
      if (!["docx", "doc", "pdf"].includes(ext)) {
        setError(`"${file.name}": format harus DOCX (disarankan), DOC, atau PDF.`);
        return;
      }
    }
    if (file.size <= 0 || file.size > SUPERVISION_DOC_MAX_BYTES) {
      setError(`"${file.name}": ukuran maksimal 10 MB per berkas.`);
      return;
    }

    setPendingDoc(docType);
    try {
      // Optimasi: browser → Storage langsung; byte tidak lewat server/DB.
      const supabase = createClient();
      const path = `${schoolId}/${supervisionId}/${docType}-${Date.now()}-${fileNameSafe(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("supervision-docs")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      // Server hanya menerima path + metadata (ringan).
      const data = new FormData();
      data.set("supervisionId", supervisionId);
      data.set("docType", docType);
      data.set("filePath", path);
      data.set("originalName", file.name);
      data.set("mimeType", file.type || (ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
      data.set("fileSize", String(file.size));
      const result = await saveSupervisionDocumentAction(
        { ok: false, error: null },
        data
      );
      if (!result.ok) {
        // Bersihkan file yatim bila metadata gagal tersimpan.
        await supabase.storage.from("supervision-docs").remove([path]);
        throw new Error(result.error ?? "Gagal menyimpan dokumen");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah berkas.");
    } finally {
      setPendingDoc(null);
      const input = inputsRef.current[docType];
      if (input) input.value = "";
    }
  }

  async function handleDelete(documentId: string) {
    if (deletingId) return;
    if (!window.confirm("Hapus dokumen ini? Berkas di penyimpanan ikut dihapus.")) return;
    setError(null);
    setDeletingId(documentId);
    try {
      const data = new FormData();
      data.set("documentId", documentId);
      data.set("supervisionId", supervisionId);
      const result = await deleteSupervisionDocumentAction(
        { ok: false, error: null },
        data
      );
      if (!result.ok) throw new Error(result.error ?? "Gagal menghapus dokumen");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus dokumen.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={doneCount === 12 ? "success" : doneCount > 0 ? "info" : "neutral"}>
          {doneCount}/12 dokumen
        </Badge>
        <span className="text-muted-foreground">
          {viewerRole === "teacher"
            ? "Lengkapi 12 dokumen sebelum supervisi. Format utama Word (.docx) — PDF didukung. Maks 10 MB/berkas."
            : "Periksa kelengkapan dokumen yang diunggah guru. Format utama Word (.docx) — PDF didukung. Maks 10 MB/berkas."}
        </span>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SUPERVISION_DOC_TYPES.map((docType, index) => {
          const doc = byType.get(docType);
          const busy = pendingDoc === docType;
          const deleting = doc != null && deletingId === doc.id;
          return (
            <li
              key={docType}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
                doc ? "border-emerald-600/20" : "border-dashed"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    #{index + 1} • {doc ? "Sudah ada" : "Belum ada"}
                  </p>
                  <p className="mt-0.5 truncate font-semibold leading-snug" title={SUPERVISION_DOC_LABELS[docType]}>
                    {SUPERVISION_DOC_LABELS[docType]}
                  </p>
                </div>
                {doc ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Sudah diunggah" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </div>

              {doc ? (
                <div className="mt-3 min-w-0 space-y-1">
                  <p className="truncate text-sm" title={doc.original_name}>
                    {doc.original_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDocx(doc.mime_type, doc.original_name) ? "DOCX" : doc.mime_type === "application/pdf" ? "PDF" : "DOC"}
                    {" • "}
                    {formatBytes(doc.file_size)}
                    {" • "}
                    {new Date(doc.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {docType === "modul_ajar"
                    ? "Disarankan DOCX agar mudah direview."
                    : "Disarankan DOCX; PDF diterima."}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                {doc?.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Unduh
                  </a>
                )}
                {canUpload && doc && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting || isPending}
                    aria-label={`Hapus ${SUPERVISION_DOC_LABELS[docType]}`}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Hapus
                  </button>
                )}
                {canUpload && (
                  <>
                    <input
                      ref={(el) => {
                        inputsRef.current[docType] = el;
                      }}
                      type="file"
                      accept={ACCEPT}
                      aria-label={`Unggah ${SUPERVISION_DOC_LABELS[docType]} (DOCX disarankan, PDF didukung)`}
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => handleFile(docType, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={busy || isPending}
                      onClick={() => inputsRef.current[docType]?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <FileUp className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {busy ? "Mengunggah…" : doc ? "Ganti" : "Unggah"}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {canUpload && viewerRole === "teacher" && (
        <p className="text-xs text-muted-foreground">
          Setelah 12 dokumen lengkap, Kepala Sekolah akan melakukan penilaian,
          lalu dilanjutkan coaching.
        </p>
      )}
    </div>
  );
}
