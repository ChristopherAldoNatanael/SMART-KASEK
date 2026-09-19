import { unstable_cache } from "next/cache";
import {
  createClient as createAnonClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Cache baca antar-request untuk data referensi yang jarang berubah
 * (master kompetensi, daftar kelas). Mengurangi query berulang saat
 * banyak pengguna konkuren membuka halaman yang sama.
 *
 * Keamanan (jangan dilonggarkan):
 * - userId SELALU bagian dari cache key → tidak ada cache lintas user.
 * - Token sesi diteruskan sebagai argumen (ikut menjadi bagian key),
 *   sehingga query tetap berjalan dalam konteks RLS user tersebut.
 * - Data per sekolah memakai tag `school-classes-<schoolId>`; mutasi
 *   wajib memanggil revalidateTag agar tulis-baca tetap konsisten.
 * - Gagal cache → fallback query langsung (fail-open ke DB, bukan error).
 */
type Db = SupabaseClient;

async function requestSession(): Promise<{
  token: string;
  userId: string;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token || !session.user?.id) return null;
    return { token: session.access_token, userId: session.user.id };
  } catch {
    return null;
  }
}

function authedClient(token: string): Db {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}

export async function withRequestCache<T>(
  key: string[],
  revalidateSeconds: number,
  tags: string[],
  work: (db: Db) => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  const session = await requestSession();
  if (!session) return fallback();

  const runner = unstable_cache(
    async (token: string) => work(authedClient(token)),
    [...key, session.userId],
    { revalidate: revalidateSeconds, tags }
  );

  try {
    return await runner(session.token);
  } catch {
    return fallback();
  }
}
