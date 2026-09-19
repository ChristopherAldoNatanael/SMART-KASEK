-- =====================================================
-- SMART KASEK — Kolom No Induk + Agama pada data siswa
-- =====================================================
-- Kolom administrasi standar rapor Indonesia:
-- - no_induk : nomor induk sekolah (boleh kosong)
-- - religion : agama (teks bebas + saran 6 agama resmi di UI)
-- Kolom student_number yang sudah ada dipakai sebagai NISN.
-- Nullable semua: data lama tetap valid tanpa migrasi data.
-- =====================================================

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS no_induk TEXT;

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS religion TEXT;
