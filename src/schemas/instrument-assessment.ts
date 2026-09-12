import { z } from "zod";
import { SUPERVISION_DOC_TYPES } from "@/lib/supervision-docs";
import { INSTRUMENT_MAX_PER_ASPECT } from "@/lib/supervision-instrument";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

const DOC_TYPES = SUPERVISION_DOC_TYPES as [string, ...string[]];

const instrumentItemSchema = z.object({
  docType: z.enum(DOC_TYPES),
  present: z.boolean(),
  score: z.number().int().min(1).max(INSTRUMENT_MAX_PER_ASPECT).nullable(),
  note: z.string().trim().max(2000).optional(),
});

/** Item dikirim sebagai JSON (draft boleh parsial, final divalidasi di service). */
const itemsJsonSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.trim() === "") return [];
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  },
  z.array(instrumentItemSchema).max(12, "Maksimal 12 aspek")
);

/** Simpan draft: parsial diperbolehkan agar bisa dilanjutkan nanti. */
export const saveInstrumentDraftSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  className: optionalText(50),
  evaluation: optionalText(5000),
  itemsJson: itemsJsonSchema,
});

export const finalizeInstrumentSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
