import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — SERVER ONLY.
 * Melewati RLS, jadi hanya dipakai di controlled tool layer
 * (public QR flow) yang sudah memvalidasi token + school scope
 * secara eksplisit. Jangan diimpor dari Client Component.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Konfigurasi server belum lengkap");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
