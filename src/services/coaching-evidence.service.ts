"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { EvidenceType, EvidenceData } from "@/lib/evidence-parser";

export type { EvidenceType, EvidenceData };

export async function getEvidenceMaxBytes(): Promise<number> {
  return 10 * 1024 * 1024; // 10 MB
}

export async function getEvidenceAllowedMimes(): Promise<string[]> {
  return [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "application/vnd.ms-excel", // .xls
    "application/vnd.ms-powerpoint", // .ppt
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "text/plain",
    "text/csv",
    "application/octet-stream", // fallback untuk beberapa sistem
  ];
}

/**
 * Serialize EvidenceData ke string untuk disimpan di database.
 */
export async function serializeEvidence(data: EvidenceData | null): Promise<string | null> {
  if (!data) return null;
  return JSON.stringify(data);
}

function isMimeRejected(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  if (
    m.includes("not supported") ||
    m.includes("unsupported") ||
    m.includes("not allowed") ||
    m.includes("not permitted")
  ) {
    return true;
  }
  // Pesan khas Supabase: "mime type ... is not supported"
  return m.includes("mime") && m.includes("support");
}

/**
 * Upload file bukti ke Supabase Storage.
 * Path: {user_id}/{actionId}-{timestamp}-{filename}
 *
 * Robust terhadap bucket yang memiliki allowed_mime_types restriktif
 * (penyebab "mime type ... is not supported" untuk .docx di production):
 * supabase-js mengabaikan opsi `contentType` saat body berupa Blob/File —
 * MIME yang dikirim berasal dari `file.type` itu sendiri. Karena itu
 * fallback harus membungkus ulang bytes ke File bertipe
 * application/octet-stream, bukan sekadar mengganti opsi contentType.
 *
 * Dipakai bersama oleh role guru maupun kepala sekolah
 * (via updateActionAction), sehingga satu perbaikan mencakup keduanya.
 */
export async function uploadEvidenceFile(
  actionId: string,
  file: File
): Promise<{ filePath: string; fileName: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const maxBytes = await getEvidenceMaxBytes();
  const allowedMimes = await getEvidenceAllowedMimes();

  if (file.size > maxBytes) {
    throw new Error("Ukuran file maksimal 10 MB");
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ALLOWED_EXTENSIONS = [
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "jpg", "jpeg", "png", "webp", "gif", "txt", "csv",
  ];

  if (
    !allowedMimes.includes(file.type) &&
    !ALLOWED_EXTENSIONS.includes(fileExt)
  ) {
    throw new Error(
      "Format file tidak didukung. Gunakan PDF, DOCX, gambar (JPG/PNG/WEBP), atau teks."
    );
  }

  const supabase = await createClient();
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${user.id}/${actionId}-${timestamp}-${sanitizedName}`;

  // Try with original MIME type first
  let uploadResult = await supabase.storage
    .from("coaching-evidence")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  // Fallback: bucket production bisa memiliki allowed_mime_types yang
  // belum mencakup .docx (atau varian MIME dari browser/OS tertentu).
  // Wajib rewrap bytes ke File octet-stream — mengganti contentType saja
  // tidak berpengaruh karena supabase-js mengirim file.type via FormData.
  if (isMimeRejected(uploadResult.error?.message)) {
    const fallbackFile = new File([file], file.name, {
      type: "application/octet-stream",
    });
    uploadResult = await supabase.storage
      .from("coaching-evidence")
      .upload(filePath, fallbackFile, {
        contentType: "application/octet-stream",
        upsert: false,
      });
  }

  if (uploadResult.error) {
    throw new Error(`Gagal mengunggah file: ${uploadResult.error.message}`);
  }

  return { filePath, fileName: file.name };
}

/**
 * Dapatkan signed URL untuk download file bukti.
 */
export async function getEvidenceDownloadUrl(
  filePath: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("coaching-evidence")
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}


