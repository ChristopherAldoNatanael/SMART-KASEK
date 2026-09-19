import { headers } from "next/headers";

/**
 * Rate limiter in-memory (token bucket sederhana).
 *
 * Tujuan: menahan brute-force login/register dan click-loop ke AI berbayar
 * saat URL disebar luas (launching/lomba).
 *
 * Batasan yang disadari:
 * - Di serverless (Vercel), tiap instance punya bucket sendiri — proteksi
 *   penuh per instance, bukan global. Tetap menaikkan biaya serangan dan
 *   bekerja penuh saat single-instance/dev.
 * - Kunci dibedakan per identitas (email/user) agar satu IP venue (NAT
 *   bersama) tidak saling memblokir.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function prune(now: number): void {
  if (buckets.size <= MAX_KEYS) return;
  buckets.forEach((bucket, key) => {
    if (buckets.size > MAX_KEYS && bucket.resetAt <= now) {
      buckets.delete(key);
    }
  });
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** IP klien di balik proxy (Vercel/LB). Aman dipanggil di Server Action. */
export function clientIp(): string {
  try {
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}
