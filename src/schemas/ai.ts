import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const aiSupervisionSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  refresh: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

const nonEmptyLines = (maxItems: number, maxLen: number) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      return v
        .split("\n")
        .map((s) => s.replace(/^\s*(?:\d+[.)]|[-•])\s*/, "").trim())
        .filter(Boolean);
    },
    z.array(z.string().trim().min(1).max(maxLen)).max(maxItems)
  );

export const aiSaveDraftSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  teacherId: z.string().regex(UUID_RE, "Guru tidak valid"),
  sessionDate: z.string().regex(DATE_RE, "Tanggal tidak valid"),
  focus: z.string().trim().min(1, "Fokus belum diisi").max(500),
  objective: z.string().trim().min(1, "Tujuan belum diisi").max(1000),
  stepsText: nonEmptyLines(5, 500),
  followUpTarget: z.string().trim().max(1000).optional().default(""),
  reflectionText: nonEmptyLines(3, 300),
});

export function firstAIIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
