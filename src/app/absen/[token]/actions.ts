"use server";

import {
  confirmAttendanceForSession,
  previewStudentForSession,
  searchStudentsForSession,
} from "@/services/attendance-session.service";
import {
  firstSessionIssueMessage,
  qrConfirmSchema,
  qrPreviewSchema,
} from "@/schemas/attendance-sessions";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export type PublicActionState =
  | { ok: true; step: "verify" | "done"; [k: string]: unknown }
  | { ok: false; error: string };

function fail(error: string): PublicActionState {
  return { ok: false, error };
}

/**
 * Pencarian nama untuk combobox. Sengaja gagal diam-diam (daftar kosong)
 * agar mengetik tidak memunculkan error; validasi asli tetap di lookup.
 */
export async function searchStudentsAction(input: {
  token: string;
  query: string;
}): Promise<{ ok: true; results: { studentId: string; fullName: string }[] }> {
  const empty = { ok: true as const, results: [] };
  const token = String(input.token ?? "").slice(0, 128);
  const query = String(input.query ?? "").slice(0, 50);
  if (token.length < 16 || query.trim().length < 2) return empty;
  const ip = clientIp();
  const rl = checkRateLimit(`qr-search:${ip}:${token}`, 30, 60_000);
  if (!rl.ok) return empty;
  try {
    const results = await searchStudentsForSession({ token, query });
    return { ok: true, results };
  } catch {
    return empty;
  }
}

/** STEP 2 — ketuk nama → pratinjau kandidat (server-side, rate-limited). */
export async function previewStudentAction(input: {
  token: string;
  studentId: string;
}): Promise<PublicActionState> {
  const parsed = qrPreviewSchema.safeParse(input);
  if (!parsed.success) return fail(firstSessionIssueMessage(parsed.error));
  const ip = clientIp();
  const rl = checkRateLimit(`qr-lookup:${ip}:${parsed.data.token}`, 20, 60_000);
  if (!rl.ok) return fail(`Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.`);
  try {
    const candidate = await previewStudentForSession(parsed.data);
    return { ok: true, step: "verify", ...candidate };
  } catch (error) {
    // Pesan error service sudah user-safe (tanpa stack trace / detail DB).
    return fail(
      error instanceof Error
        ? error.message
        : "Absensimu belum tercatat karena gangguan sistem. Coba scan ulang QR, atau hubungi guru."
    );
  }
}

/** STEP 3 — konfirmasi (server timestamp, idempotent, anti-duplikat). */
export async function confirmAttendanceAction(input: {
  token: string;
  studentId: string;
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
    return fail(
      error instanceof Error
        ? error.message
        : "Absensimu belum tercatat karena gangguan sistem. Tetap di halaman ini dan coba lagi, atau hubungi guru."
    );
  }
}
