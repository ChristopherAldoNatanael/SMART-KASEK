"use server";

import {
  confirmAttendanceForSession,
  lookupStudentForSession,
} from "@/services/attendance-session.service";
import {
  firstSessionIssueMessage,
  qrConfirmSchema,
  qrIdentitySchema,
} from "@/schemas/attendance-sessions";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export type PublicActionState =
  | { ok: true; step: "verify" | "done"; [k: string]: unknown }
  | { ok: false; error: string };

function fail(error: string): PublicActionState {
  return { ok: false, error };
}

/** STEP 2 — identitas → verifikasi singkat (server-side, rate-limited). */
export async function lookupStudentAction(input: {
  token: string;
  fullName: string;
  studentCode: string;
}): Promise<PublicActionState> {
  const parsed = qrIdentitySchema.safeParse(input);
  if (!parsed.success) return fail(firstSessionIssueMessage(parsed.error));
  const ip = clientIp();
  const rl = checkRateLimit(`qr-lookup:${ip}:${parsed.data.token}`, 20, 60_000);
  if (!rl.ok) return fail(`Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.`);
  try {
    const candidate = await lookupStudentForSession(parsed.data);
    return { ok: true, step: "verify", ...candidate };
  } catch (error) {
    // Pesan error service sudah user-safe (tanpa stack trace / detail DB).
    return fail(error instanceof Error ? error.message : "Absensi belum berhasil diproses. Silakan coba lagi.");
  }
}

/** STEP 4 — konfirmasi (server timestamp, idempotent, anti-duplikat). */
export async function confirmAttendanceAction(input: {
  token: string;
  studentId: string;
  studentCode: string;
}): Promise<PublicActionState> {
  const parsed = qrConfirmSchema.safeParse(input);
  if (!parsed.success) return fail(firstSessionIssueMessage(parsed.error));
  const ip = clientIp();
  const rl = checkRateLimit(`qr-confirm:${ip}:${parsed.data.token}`, 10, 60_000);
  if (!rl.ok) return fail(`Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.`);
  try {
    const result = await confirmAttendanceForSession(parsed.data);
    return { ok: true, step: "done", ...result };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Absensi belum berhasil disimpan. Silakan coba lagi.");
  }
}
