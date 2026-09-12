import { z } from "zod";
import { SUPERVISION_DOC_TYPES } from "@/lib/supervision-docs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const saveSupervisionDocumentSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  docType: z.enum(SUPERVISION_DOC_TYPES as [string, ...string[]]),
  filePath: z.string().trim().min(3).max(500),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(150),
  fileSize: z.coerce.number().int().positive().max(10 * 1024 * 1024),
});

export const deleteSupervisionDocumentSchema = z.object({
  documentId: z.string().regex(UUID_RE, "Dokumen tidak valid"),
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
