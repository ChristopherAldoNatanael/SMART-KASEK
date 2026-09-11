import { z } from "zod";

/**
 * Zod schemas for two-role onboarding.
 * App roles are ONLY 'principal' (Kepala Sekolah) | 'teacher' (Guru).
 */

export const ONBOARDING_ROLES = ["principal", "teacher"] as const;

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(max).optional()
  );

export const chooseRoleSchema = z.object({
  role: z.enum(ONBOARDING_ROLES, { message: "Peran tidak valid" }),
});

export const createSchoolSchema = z.object({
  name: z.string().trim().min(3, "Nama sekolah minimal 3 karakter").max(200),
  npsn: optionalText(20),
  address: optionalText(500),
  phone: optionalText(30),
  email: optionalText(200),
});

export const joinSchoolSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Kode undangan tidak valid")
    .max(20, "Kode undangan tidak valid")
    .transform((v) => v.toUpperCase()),
  subject: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(100).optional()
  ),
  homeroomClass: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(50).optional()
  ),
  nip: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(50).optional()
  ),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}

/** Map RPC error codes to user-safe Indonesian messages (pure). */
export function rpcErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("CODE_NOT_FOUND") || raw.includes("INVALID_CODE"))
    return "Kode undangan tidak ditemukan. Periksa kembali kode dari Kepala Sekolah.";
  if (raw.includes("ALREADY_LINKED"))
    return "Akun ini sudah terhubung ke sekolah.";
  if (raw.includes("NO_PROFILE"))
    return "Profil belum dibuat. Pilih peran Anda terlebih dahulu.";
  if (raw.includes("INVALID_ROLE"))
    return "Peran tidak valid. Pilih Guru atau Kepala Sekolah.";
  if (raw.includes("FORBIDDEN_NOT_PRINCIPAL"))
    return "Hanya Kepala Sekolah yang dapat membuat sekolah.";
  if (raw.includes("INVALID_NAME")) return "Nama sekolah tidak valid.";
  if (raw.includes("NPSN_TAKEN") || raw.includes("duplicate key"))
    return "NPSN sudah digunakan sekolah lain.";
  if (raw.includes("NO_SCHOOL"))
    return "Akun Anda belum terhubung ke sekolah.";
  if (raw.includes("INVALID_LOGO_SIZE"))
    return "Ukuran logo harus 24–64 piksel.";
  return "Terjadi kesalahan. Silakan coba lagi.";
}
