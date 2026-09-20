import { z } from "zod";

export const updateAccountNameSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter").max(200),
});

export const updateAccountEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email wajib diisi")
    .max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Alamat email tidak valid"),
});

export const updateAccountPasswordSchema = z
  .object({
    password: z.string().min(6, "Kata sandi minimal 6 karakter").max(100),
    confirmPassword: z.string().min(1, "Ulangi kata sandi baru"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Ulangi kata sandi tidak sama",
    path: ["confirmPassword"],
  });

export function firstAccountIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}

/** Foto profil custom: format & ukuran yang diterima. */
export const ALLOWED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
