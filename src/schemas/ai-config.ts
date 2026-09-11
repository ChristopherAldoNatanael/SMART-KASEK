import { z } from "zod";

/**
 * Zod schemas for AI provider management (ronde-24).
 * Full keys never leave the server; UI only sees masked suffixes.
 */

export const AI_CONFIG_PROVIDERS = ["openai", "custom", "gemini"] as const;

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

export const createAIConfigSchema = z.object({
  label: z.string().trim().min(2, "Nama minimal 2 karakter").max(50),
  provider: z.enum(AI_CONFIG_PROVIDERS),
  baseUrl: z
    .string()
    .trim()
    .min(1, "Base URL wajib diisi")
    .max(200)
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
      message: "Base URL harus http(s)",
    }),
  model: z.string().trim().min(1, "Model wajib diisi").max(100),
  apiKey: z.string().trim().min(8, "API key tidak valid").max(500),
  priority: z.preprocess(
    (v) => (v == null || v === "" ? 100 : Number(v)),
    z.number().int().min(1).max(1000)
  ),
});

export type CreateAIConfigInput = z.infer<typeof createAIConfigSchema>;

export const aiConfigIdSchema = z.object({
  configId: z.string().uuid("Konfigurasi tidak valid"),
});

export const toggleAIConfigSchema = aiConfigIdSchema.extend({
  active: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
