"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  deleteSupervisionDocument,
  saveSupervisionDocument,
} from "@/services/supervision-documents.service";
import type { SupervisionDocType } from "@/lib/supervision-docs";
import { logAuditEvent } from "@/services/audit.service";
import {
  deleteSupervisionDocumentSchema,
  firstIssueMessage,
  saveSupervisionDocumentSchema,
} from "@/schemas/supervision-documents";

export type SupervisionDocActionState = {
  ok: boolean;
  error: string | null;
};

async function requireDocMutation(): Promise<string | null> {
  const user = await requireUser();
  if (!user.schoolId) return "Akun Anda belum terhubung ke sekolah";
  // Kepemilikan dicek di service: guru hanya supervisi miliknya,
  // kepala sekolah/admin penuh.
  return null;
}

/**
 * Catat metadata dokumen setelah browser mengunggah langsung ke Storage.
 * Byte file TIDAK lewat server Next.js (hemat memori/bandwidth);
 * server hanya validasi + simpan path (1 baris per doc_type).
 */
export async function saveSupervisionDocumentAction(
  _prev: SupervisionDocActionState,
  formData: FormData
): Promise<SupervisionDocActionState> {
  const blocked = await requireDocMutation();
  if (blocked) return { ok: false, error: blocked };

  const parsed = saveSupervisionDocumentSchema.safeParse({
    supervisionId: formData.get("supervisionId"),
    docType: formData.get("docType"),
    filePath: formData.get("filePath"),
    originalName: formData.get("originalName"),
    mimeType: formData.get("mimeType"),
    fileSize: formData.get("fileSize"),
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const doc = await saveSupervisionDocument({
      supervisionId: parsed.data.supervisionId,
      docType: parsed.data.docType as SupervisionDocType,
      filePath: parsed.data.filePath,
      originalName: parsed.data.originalName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
    });
    await logAuditEvent({
      action: "upload",
      entity: "supervision_documents",
      entityId: doc.id,
      newData: { supervision_id: doc.supervision_id, doc_type: doc.doc_type },
    });
  } catch (error) {
    console.error("saveSupervisionDocumentAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan dokumen",
    };
  }

  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return { ok: true, error: null };
}

export async function deleteSupervisionDocumentAction(
  _prev: SupervisionDocActionState,
  formData: FormData
): Promise<SupervisionDocActionState> {
  const blocked = await requireDocMutation();
  if (blocked) return { ok: false, error: blocked };

  const parsed = deleteSupervisionDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    supervisionId: formData.get("supervisionId"),
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    await deleteSupervisionDocument(parsed.data.documentId);
    await logAuditEvent({
      action: "delete",
      entity: "supervision_documents",
      entityId: parsed.data.documentId,
    });
  } catch (error) {
    console.error("deleteSupervisionDocumentAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus dokumen",
    };
  }

  revalidatePath(`/supervision/${parsed.data.supervisionId}`);
  return { ok: true, error: null };
}
