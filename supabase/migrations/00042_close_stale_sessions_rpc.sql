-- =====================================================
-- SMART KASEK — RPC tutup sesi QR basi (cadangan pg_cron)
-- =====================================================
-- Lapis penutup sesi QR kemarin:
-- 1. Lazy-close per request (kode, selalu aktif).
-- 2. Vercel Cron 00:05 WIB → /api/cron/close-stale-sessions (utama).
-- 3. Fungsi ini → untuk Supabase pg_cron bila sekolah memakai
--    scheduler database langsung (opsional, tidak wajib).
--
-- Aman & idempotent: hanya status='open' dengan date < CURRENT_DATE
-- yang disentuh. Rekap class_attendance tidak tersentuh.
-- Jadwal yang disarankan (zona DB UTC): 17:05 UTC = 00:05 WIB:
--   SELECT cron.schedule(
--     'close-stale-qr-sessions',
--     '5 17 * * *',
--     $$SELECT public.close_stale_attendance_sessions()$$
--   );
-- =====================================================

CREATE OR REPLACE FUNCTION public.close_stale_attendance_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_closed INTEGER := 0;
BEGIN
    UPDATE attendance_sessions
    SET status = 'closed'
    WHERE status = 'open'
      AND date < CURRENT_DATE;
    GET DIAGNOSTICS v_closed = ROW_COUNT;
    RETURN v_closed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.close_stale_attendance_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_stale_attendance_sessions() TO service_role;
