-- =====================================================
-- SMART KASEK — Tautan eksternal modul ajar (ronde-26)
-- =====================================================
-- Modul ajar punya DUA sumber dokumen yang independen:
-- - file_url : path Storage privat (upload), atau URL https lama
-- - doc_url  : tautan eksternal (website, YouTube, Drive, ...)
-- Keduanya opsional dan boleh terisi bersamaan.
-- Aditif: tidak menyentuh data existing.
-- =====================================================

ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS doc_url TEXT;
