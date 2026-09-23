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

/**
 * Batas QR sadar-kelas (jangka panjang):
 * Satu kelas (±30–40 anak) sering scan bareng lewat 1 WiFi sekolah
 * = 1 IP publik + 1 token yang sama. Batas per IP+token yang terlalu
 * kecil memblokir anak sah ("Terlalu banyak percobaan") padahal bukan
 * spam. Angka di bawah menampung 1 kelas penuh dalam ±2 menit:
 * - cari: tiap anak bisa 3–5x ketik (debounce) → 40 anak ≈ 200 hit/2 mnt
 * - pratinjau/konfirmasi: 1–2x per anak → 40 anak ≈ 80 hit/2 mnt
 * Anti brute-force token tetap ada via batas global per token di bawah.
 */
const QR_SEARCH_LIMIT = 200;
const QR_LOOKUP_LIMIT = 80;
const QR_CONFIRM_LIMIT = 80;
/** Plafon global per token (anti sebar QR ke luar sekolah). */
const QR_TOKEN_GLOBAL_SEARCH = 600;
const QR_TOKEN_GLOBAL_CONFIRM = 200;

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
  const rl = checkRateLimit(`qr-search:${ip}:${token}`, QR_SEARCH_LIMIT, 120_000);
  if (!rl.ok) return empty;
  const rlGlobal = checkRateLimit(`qr-search:token:${token}`, QR_TOKEN_GLOBAL_SEARCH, 120_000);
  if (!rlGlobal.ok) return empty;
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
  const rl = checkRateLimit(`qr-lookup:${ip}:${parsed.data.token}`, QR_LOOKUP_LIMIT, 120_000);
  if (!rl.ok)
    return fail(
      `Banyak yang absen bareng, antre sebentar ya. Coba lagi dalam ${rl.retryAfterSec} detik.`
    );
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
  const rl = checkRateLimit(`qr-confirm:${ip}:${parsed.data.token}`, QR_CONFIRM_LIMIT, 120_000);
  if (!rl.ok)
    return fail(
      `Banyak yang absen bareng, antre sebentar ya. Coba lagi dalam ${rl.retryAfterSec} detik.`
    );
  const rlGlobal = checkRateLimit(
    `qr-confirm:token:${parsed.data.token}`,
    QR_TOKEN_GLOBAL_CONFIRM,
    120_000
  );
  if (!rlGlobal.ok)
    return fail(
      `Banyak yang absen bareng, antre sebentar ya. Coba lagi dalam ${rlGlobal.retryAfterSec} detik.`
    );
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
