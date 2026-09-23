import { NextResponse } from "next/server";
import { closeAllStaleSessions } from "@/services/attendance-session.service";

export const dynamic = "force-dynamic";

/**
 * Cron 00:05 WIB: tutup sesi QR kemarin yang lupa ditutup.
 * Cadangan dari lazy-close per request (tetap ada sebagai lapis 1).
 *
 * Keamanan: wajib CRON_SECRET. Vercel Cron tidak mengirim header
 * kustom, jadi secret diterima via `Authorization: Bearer` (disarankan,
 * untuk scheduler eksternal) ATAU query `?secret=` (untuk Vercel Cron
 * yang URL-nya diisi lengkap di dashboard). Tanpa secret → 401.
 * Secret TIDAK pernah di-echo ke response.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") === secret) return true;
  } catch {
    // abaikan — jatuh ke unauthorized di bawah
  }
  return false;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("close-stale-sessions cron: CRON_SECRET belum disetel");
    return NextResponse.json(
      { ok: false, error: "Cron belum dikonfigurasi (CRON_SECRET kosong)" },
      { status: 500 }
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { closed, date } = await closeAllStaleSessions();
    console.log(`close-stale-sessions cron: ${closed} sesi ditutup (patokan ${date} WIB)`);
    return NextResponse.json({ ok: true, closed, date });
  } catch (error) {
    console.error("close-stale-sessions cron error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Gagal menutup sesi basi" },
      { status: 500 }
    );
  }
}
