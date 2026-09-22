-- =====================================================
-- SMART KASEK — Auto-tutup sesi QR yang tanggalnya lewat
-- =====================================================
-- Masalah: guru membuka sesi QR lalu lupa menekan "Tutup sesi",
-- sesi berstatus 'open' selamanya dan QR kemarin masih bisa
-- dipakai hari ini (membingungkan: tanggal absen tidak berubah).
--
-- Perbaikan berlapis:
-- 1. Kode (attendance-session.service): sesi dianggap kedaluwarsa
--    begitu tanggalnya < hari ini (WIB), plus lazy-close di DB
--    setiap kali sesi basi terbaca (jalur guru maupun publik).
-- 2. Migrasi ini: sapu bersih SATU KALI semua baris yang saat
--    ini menggantung 'open' padahal tanggalnya sudah lewat.
--
-- Aman & idempotent: hanya menyentuh baris status='open' dengan
-- date < CURRENT_DATE. Tidak mengubah rekap (class_attendance
-- tidak tersentuh) dan aman dijalankan ulang.
-- =====================================================

UPDATE attendance_sessions
SET status = 'closed'
WHERE status = 'open'
  AND date < CURRENT_DATE;
