-- =====================================================
-- SMART KASEK — Nonaktifkan dimensi Sosial/Kepribadian/Digital
-- =====================================================
-- Kompetensi yang dipakai: Pedagogik, Profesional, Asesmen,
-- Manajemen Kelas. Tiga dimensi (Sosial, Kepribadian, Digital)
-- tidak punya jalur penilaian yang jelas (dulu hanya bisa diisi
-- manual bebas tanpa jejak) sehingga dinonaktifkan.
--
-- Nonaktif (bukan DELETE) agar riwayat nilai lama tetap utuh.
-- Engine growth dan daftar hanya membaca master aktif, sehingga
-- dimensi ini hilang dari UI dengan sendirinya.
-- Idempotent: aman dijalankan ulang.
-- =====================================================

UPDATE competencies
SET is_active = false
WHERE name IN ('Sosial', 'Kepribadian', 'Digital');
