"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import {
  SUPERVISION_DOC_MAX_BYTES,
  SUPERVISION_DOC_MIMES,
  type SupervisionDocType,
} from "@/lib/supervision-docs";
import type { Database } from "@/types/database";

type SupervisionDocument =
  Database["public"]["Tables"]["supervision_documents"]["Row"];

export type SupervisionDocumentWithUrl = SupervisionDocument & {
  /** Signed URL 1 jam; null bila gagal dibuat. */
  downloadUrl: string | null;
};

function fileNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dash = base.indexOf("-");
  return dash >= 0 ? base.slice(dash + 1) : base;
}

async function resolveDownload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("supervision-docs")
    .createSignedUrl(filePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Hak tulis dokumen: principal/admin selalu boleh; guru hanya pada
 * supervisi miliknya sendiri. Alur: guru mengunggah perangkat
 * → kepala sekolah menilai → coaching.
 */
async function assertCanWriteDocs(
  user: { id: string; role: string; schoolId: string | null },
  supervisionId: string
): Promise<void> {
  if (!user.schoolId) throw new Error("No school access");
  if (user.role === "principal" || user.role === "admin") return;
  if (user.role !== "teacher") {
    throw new Error("Anda tidak berhak mengelola dokumen ini");
  }
  const ownId = await getOwnTeacherId(user.id, user.schoolId);
  if (!ownId) {
    throw new Error("Data guru Anda belum terhubung ke sekolah");
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisions")
    .select("teacher_id")
    .eq("id", supervisionId)
    .eq("school_id", user.schoolId)
    .single();
  if (!data || data.teacher_id !== ownId) {
    throw new Error("Anda hanya dapat mengelola dokumen supervisi milik Anda");
  }
}

/**
 * Scope sekolah: pastikan supervisi milik sekolah user.
 * Teacher hanya boleh membaca supervisi miliknya sendiri.
 * Mengembalikan schoolId + supervisionId bila lolos.
 */
async function resolveSupervisionScope(supervisionId: string): Promise<{
  schoolId: string;
  supervisionId: string;
} | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisions")
    .select("id, school_id, teacher_id")
    .eq("id", supervisionId)
    .eq("school_id", user.schoolId)
    .single();
  if (!data) return null;
  if (user.role === "teacher") {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    if (!ownId || ownId !== data.teacher_id) return null;
  }
  return { schoolId: user.schoolId, supervisionId: data.id };
}

/**
 * Daftar dokumen: 1 query ringan (metadata saja, tanpa byte file).
 * Signed URL dibuat per baris (maks 12) dengan TTL pendek.
 */
export async function getSupervisionDocuments(
  supervisionId: string
): Promise<SupervisionDocumentWithUrl[]> {
  const scope = await resolveSupervisionScope(supervisionId);
  if (!scope) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervision_documents")
    .select("id, supervision_id, doc_type, file_path, original_name, mime_type, file_size, created_at")
    .eq("supervision_id", scope.supervisionId)
    .order("doc_type");
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (d) => ({
      ...d,
      downloadUrl: await resolveDownload(supabase, d.file_path),
      // fallback nama bila original_name kosong (data lama)
      original_name: d.original_name || fileNameFromPath(d.file_path),
    }))
  );
}

/**
 * Catat metadata setelah browser mengunggah langsung ke Storage.
 * Pola upsert per doc_type: 1 jenis = 1 file (hemat DB, cegah duplikat).
 * Berkas lama di Storage dihapus (best effort) agar tidak orphan.
 */
export async function saveSupervisionDocument(input: {
  supervisionId: string;
  docType: SupervisionDocType;
  filePath: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}): Promise<SupervisionDocument> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  await assertCanWriteDocs(user, input.supervisionId);
  if (!SUPERVISION_DOC_MIMES.includes(input.mimeType as (typeof SUPERVISION_DOC_MIMES)[number])) {
    throw new Error("Format harus DOCX (disarankan), DOC, atau PDF");
  }
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0 || input.fileSize > SUPERVISION_DOC_MAX_BYTES) {
    throw new Error("Ukuran berkas maksimal 10 MB");
  }
  // Path wajib terisolasi: {school_id}/{supervision_id}/...
  const expectedPrefix = `${user.schoolId}/${input.supervisionId}/`;
  if (!input.filePath.startsWith(expectedPrefix)) {
    throw new Error("Path berkas tidak valid");
  }

  const supabase = await createClient();
  const { data: supervision } = await supabase
    .from("supervisions")
    .select("id")
    .eq("id", input.supervisionId)
    .eq("school_id", user.schoolId)
    .single();
  if (!supervision) throw new Error("Supervisi tidak ditemukan");

  const { data: existing } = await supabase
    .from("supervision_documents")
    .select("id, file_path")
    .eq("supervision_id", input.supervisionId)
    .eq("doc_type", input.docType)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("supervision_documents")
      .update({
        file_path: input.filePath,
        original_name: input.originalName.slice(0, 255),
        mime_type: input.mimeType,
        file_size: Math.floor(input.fileSize),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (existing.file_path !== input.filePath) {
      await supabase.storage.from("supervision-docs").remove([existing.file_path]);
    }
    return data;
  }

  const { data, error } = await supabase
    .from("supervision_documents")
    .insert({
      supervision_id: input.supervisionId,
      doc_type: input.docType,
      file_path: input.filePath,
      original_name: input.originalName.slice(0, 255),
      mime_type: input.mimeType,
      file_size: Math.floor(input.fileSize),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Hapus baris + berkas Storage (kegagalan Storage tidak menggagalkan). */
export async function deleteSupervisionDocument(documentId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("supervision_documents")
    .select("id, file_path, supervision_id")
    .eq("id", documentId)
    .single();
  if (!row) throw new Error("Dokumen tidak ditemukan");
  await assertCanWriteDocs(user, row.supervision_id);

  const { data: supervision } = await supabase
    .from("supervisions")
    .select("id")
    .eq("id", row.supervision_id)
    .eq("school_id", user.schoolId)
    .single();
  if (!supervision) throw new Error("Dokumen tidak ditemukan");

  const { error } = await supabase
    .from("supervision_documents")
    .delete()
    .eq("id", documentId);
  if (error) throw new Error(error.message);
  const { error: storageError } = await supabase.storage
    .from("supervision-docs")
    .remove([row.file_path]);
  if (storageError) console.error("supervision-docs remove error:", storageError.message);
}
