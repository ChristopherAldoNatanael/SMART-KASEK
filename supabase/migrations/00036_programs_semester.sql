-- =====================================================
-- SMART KASEK — Program Kegiatan per Semester
-- =====================================================
-- Dokumen sekolah (contoh: PROGRAM KEGIATAN SEMESTER 1
-- TAHUN PELAJARAN 2026/2027) disusun per semester + tahun
-- pelajaran, jadi programs diberi kedua kolom tersebut.
-- Aman: nullable, tanpa mengubah/hapus data existing.
-- Backfill dari tanggal: Juli–Des = Semester 1 (y/y+1),
-- Januari–Juni = Semester 2 (y-1/y).
-- =====================================================

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS semester SMALLINT
  CHECK (semester IN (1, 2));

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

UPDATE programs
SET
  semester = CASE
    WHEN start_date IS NULL THEN NULL
    WHEN EXTRACT(MONTH FROM start_date)::int >= 7 THEN 1
    ELSE 2
  END,
  academic_year = CASE
    WHEN start_date IS NULL THEN NULL
    WHEN EXTRACT(MONTH FROM start_date)::int >= 7 THEN
      EXTRACT(YEAR FROM start_date)::int || '/' || (EXTRACT(YEAR FROM start_date)::int + 1)
    ELSE
      (EXTRACT(YEAR FROM start_date)::int - 1) || '/' || EXTRACT(YEAR FROM start_date)::int
  END
WHERE semester IS NULL OR academic_year IS NULL;

CREATE INDEX IF NOT EXISTS idx_programs_school_term
  ON programs(school_id, academic_year, semester);
