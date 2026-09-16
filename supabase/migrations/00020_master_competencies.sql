-- =====================================================
-- SMART KASEK — Master kompetensi untuk production
-- =====================================================
-- Tabel competencies adalah master data global (RLS: dibaca semua
-- user login, ditulis hanya admin). seed-demo.sql hanya untuk demo
-- dan tidak dijalankan di production, sehingga database production
-- memiliki tabel competencies KOSONG. Akibatnya halaman detail guru
-- selalu menampilkan "Belum ada data kompetensi" dan form input
-- nilai (yang membutuhkan daftar master) tidak pernah muncul —
-- deadlock permanen.
--
-- Migration ini mengisi 7 kompetensi inti yang selaras dengan:
-- - DIMENSIONS di teachers/[id]/page.tsx
-- - dimensionColumnFor() di src/lib/growth.ts
-- - seed-demo.sql (UUID sama agar demo & production selaras)
--
-- Idempotent: aman dijalankan ulang (ON CONFLICT DO NOTHING).
-- Ini master/reference data, bukan fake business data.
-- =====================================================

INSERT INTO competencies (id, name, category, description, weight, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Pedagogik', 'Inti', 'Kompetensi mengelola pembelajaran', 1.00, true),
  ('b0000000-0000-0000-0000-000000000002', 'Profesional', 'Inti', 'Kompetensi pengembangan profesional', 1.00, true),
  ('b0000000-0000-0000-0000-000000000003', 'Sosial', 'Inti', 'Kompetensi berinteraksi dan berkomunikasi', 0.80, true),
  ('b0000000-0000-0000-0000-000000000004', 'Kepribadian', 'Inti', 'Kompetensi kepribadian yang mantap', 0.80, true),
  ('b0000000-0000-0000-0000-000000000005', 'Digital', 'Penunjang', 'Kompetensi pemanfaatan teknologi digital', 0.90, true),
  ('b0000000-0000-0000-0000-000000000006', 'Asesmen', 'Penunjang', 'Kompetensi penilaian pembelajaran', 1.00, true),
  ('b0000000-0000-0000-0000-000000000007', 'Manajemen Kelas', 'Penunjang', 'Kompetensi mengelola kelas', 0.90, true)
ON CONFLICT (id) DO NOTHING;
