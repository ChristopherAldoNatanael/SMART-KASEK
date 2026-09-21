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
  SUPERVISION_DOC_MAX_FILES_PER_TYPE,
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

function kindLabel(mime: string, name: string): string {
  const lower = name.toLowerCase();
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "DOCX";
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  return "DOC";
}

function validateOne(file: File): string | null {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!["docx", "doc", "pdf"].includes(ext)) {
    return `"${file.name}": format harus DOCX (disarankan), DOC, atau PDF.`;
  }
  if (
    file.type &&
    !ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])
  ) {
    return `"${file.name}": tipe berkas tidak didukung.`;
  }
  if (file.size <= 0 || file.size > SUPERVISION_DOC_MAX_BYTES) {
    return `"${file.name}": ukuran maksimal 10 MB per berkas.`;
  }
  return null;
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
  const [pendingCount, setPendingCount] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<Partial<Record<SupervisionDocType, HTMLInputElement | null>>>({});

  const byType = useMemo(() => {
    const map = new Map<SupervisionDocType, SupervisionDocumentWithUrl[]>();
    for (const t of SUPERVISION_DOC_TYPES) map.set(t, []);
    for (const d of initialDocs) {
      const list = map.get(d.doc_type as SupervisionDocType);
      if (list) list.push(d);
      else map.set(d.doc_type as SupervisionDocType, [d]);
    }
    return map;
  }, [initialDocs]);

  const coveredCount = useMemo(
    () =>
      SUPERVISION_DOC_TYPES.filter(
        (t) => (byType.get(t) ?? []).length > 0
      ).length,
    [byType]
  );
  const totalFiles = initialDocs.length;

  async function handleFiles(docType: SupervisionDocType, files: FileList | undefined | null) {
    if (!files || files.length === 0 || pendingDoc) return;
    const list = Array.from(files);
    const existing = byType.get(docType)?.length ?? 0;
    if (existing + list.length > SUPERVISION_DOC_MAX_FILES_PER_TYPE) {
      setError(
        `${SUPERVISION_DOC_LABELS[docType]}: maksimal ${SUPERVISION_DOC_MAX_FILES_PER_TYPE} berkas per jenis (sudah ada ${existing}).`
      );
      const input = inputsRef.current[docType];
      if (input) input.value = "";
      return;
    }
    for (const f of list) {
      const problem = validateOne(f);
      if (problem) {
        setError(problem);
        const input = inputsRef.current[docType];
        if (input) input.value = "";
        return;
      }
    }

    setError(null);
    setPendingDoc(docType);
    try {
      const supabase = createClient();
      let uploaded = 0;
      const failures: string[] = [];
      for (const file of list) {
        setPendingCount(
          list.length > 1 ? `${uploaded + 1}/${list.length}` : null
        );
        const ext = file.name.toLowerCase().split(".").pop() ?? "";
        // Optimasi: browser → Storage langsung; byte tidak lewat server/DB.
        const path = `${schoolId}/${supervisionId}/${docType}-${Date.now()}-${uploaded}-${fileNameSafe(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("supervision-docs")
          .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (uploadError) {
          failures.push(`"${file.name}": ${uploadError.message}`);
          continue;
        }

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
          failures.push(`"${file.name}": ${result.error ?? "Gagal menyimpan dokumen"}`);
          continue;
        }
        uploaded += 1;
      }
      if (failures.length > 0) {
        setError(
          uploaded > 0
            ? `${uploaded} berkas terunggah. Gagal: ${failures.join(" ")}`
            : failures.join(" ")
        );
      }
      if (uploaded > 0) startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah berkas.");
    } finally {
      setPendingDoc(null);
      setPendingCount(null);
      const input = inputsRef.current[docType];
      if (input) input.value = "";
    }
  }

  async function handleDelete(documentId: string, label: string) {
    if (deletingId) return;
    if (!window.confirm(`Hapus "${label}"? Berkas di penyimpanan ikut dihapus.`)) return;
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
        <Badge tone={coveredCount === 12 ? "success" : coveredCount > 0 ? "info" : "neutral"}>
          {coveredCount}/12 jenis • {totalFiles} berkas
        </Badge>
        <span className="text-muted-foreground">
          {viewerRole === "teacher"
            ? `Lengkapi 12 jenis dokumen sebelum supervisi. Tiap jenis boleh lebih dari 1 berkas (maks ${SUPERVISION_DOC_MAX_FILES_PER_TYPE}/jenis). Format utama Word (.docx) — PDF didukung. Maks 10 MB/berkas.`
            : `Periksa kelengkapan dokumen yang diunggah guru. Tiap jenis dapat berisi lebih dari 1 berkas. Format utama Word (.docx) — PDF didukung. Maks 10 MB/berkas.`}
        </span>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SUPERVISION_DOC_TYPES.map((docType, index) => {
          const docs = byType.get(docType) ?? [];
          const busy = pendingDoc === docType;
          const hasDocs = docs.length > 0;
          return (
            <li
              key={docType}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
                hasDocs ? "border-emerald-600/20" : "border-dashed"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    #{index + 1} • {hasDocs ? `${docs.length} berkas` : "Belum ada"}
                  </p>
                  <p className="mt-0.5 truncate font-semibold leading-snug" title={SUPERVISION_DOC_LABELS[docType]}>
                    {SUPERVISION_DOC_LABELS[docType]}
                  </p>
                </div>
                {hasDocs ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Sudah diunggah" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </div>

              {hasDocs ? (
                <ul className="mt-3 space-y-2">
                  {docs.map((doc) => {
                    const deleting = deletingId === doc.id;
                    return (
                      <li
                        key={doc.id}
                        className="min-w-0 rounded-lg border bg-muted/30 p-2.5"
                      >
                        <p className="truncate text-sm font-medium" title={doc.original_name}>
                          {doc.original_name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {kindLabel(doc.mime_type, doc.original_name)}
                          {" • "}
                          {formatBytes(doc.file_size)}
                          {" • "}
                          {new Date(doc.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
                            >
                              <Download className="h-3 w-3" aria-hidden />
                              Unduh
                            </a>
                          )}
                          {canUpload && (
                            <button
                              type="button"
                              onClick={() => handleDelete(doc.id, doc.original_name)}
                              disabled={deleting || isPending}
                              aria-label={`Hapus berkas ${doc.original_name}`}
                              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {deleting ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-3 w-3" aria-hidden />
                              )}
                              Hapus
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {docType === "modul_ajar"
                    ? "Disarankan DOCX agar mudah direview. Boleh unggah beberapa berkas sekaligus."
                    : "Disarankan DOCX; PDF diterima. Boleh unggah beberapa berkas sekaligus."}
                </p>
              )}

              {canUpload && (
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                  <input
                    ref={(el) => {
                      inputsRef.current[docType] = el;
                    }}
                    type="file"
                    accept={ACCEPT}
                    multiple
                    aria-label={`Unggah ${SUPERVISION_DOC_LABELS[docType]} (bisa lebih dari 1 berkas; DOCX disarankan, PDF didukung)`}
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => handleFiles(docType, e.target.files)}
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
                    {busy
                      ? pendingCount
                        ? `Mengunggah ${pendingCount}…`
                        : "Mengunggah…"
                      : hasDocs
                        ? "Tambah berkas"
                        : "Unggah"}
                  </button>
                  {hasDocs && (
                    <span className="text-[11px] text-muted-foreground">
                      {docs.length}/{SUPERVISION_DOC_MAX_FILES_PER_TYPE} berkas
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {canUpload && viewerRole === "teacher" && (
        <p className="text-xs text-muted-foreground">
          Setelah 12 jenis dokumen terisi (tiap jenis boleh lebih dari 1
          berkas), Kepala Sekolah akan melakukan penilaian, lalu dilanjutkan
          coaching.
        </p>
      )}
    </div>
  );
}
