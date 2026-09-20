import { z } from "zod";

/**
 * Zod schemas for Pengaturan sekolah (ronde-12).
 * Field names follow Indonesian school administration (Dapodik-style).
 */

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

export const updateSchoolSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama satuan pendidikan minimal 3 karakter")
    .max(200),
  npsn: optionalText(20),
  address: optionalText(500),
  village: optionalText(100),
  district: optionalText(100),
  city: optionalText(100),
  province: optionalText(100),
  phone: optionalText(30),
  email: optionalText(200),
  principalName: optionalText(200),
  principalNip: optionalText(50),
  logoSize: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : Number(v),
    z.number().int().min(24).max(64).optional()
  ),
});

export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;

export const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** TTD & stempel: tanpa SVG (hasil scan/foto selalu raster). */
export const ALLOWED_DOC_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_DOC_BYTES = 2 * 1024 * 1024;

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
