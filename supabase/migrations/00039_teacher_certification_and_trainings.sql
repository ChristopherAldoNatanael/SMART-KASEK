-- =====================================================
-- SMART KASEK — Sertifikasi guru + pelatihan Teacher Growth
-- =====================================================
-- 1. Sertifikasi = kolom profil di teachers (BUKAN pelatihan).
--    Ditulis hanya oleh Kepala Sekolah: dijaga service layer
--    (updateTeacherCertification) + trigger guard di bawah.
--    Trigger diperlukan karena policy teachers_update (00008)
--    mengizinkan guru mengubah barisnya sendiri.
-- 2. trainings = kegiatan pengembangan, school-scoped.
--    Poin dimasukkan SEKALI per kegiatan oleh Kepala Sekolah.
-- 3. training_participants = relasi ke teachers yang sudah ada
--    (tanpa data guru duplikat). Poin per guru = SUM poin
--    pelatihan yang diikutinya, dihitung saat read (rekap),
--    tidak disimpan ulang per guru.
--
-- RLS mengikuti pola coaching_sessions: baca se-sekolah,
-- tulis/hapus oleh Kepala Sekolah di sekolah sendiri.
-- =====================================================

-- ---------- 1. Kolom sertifikasi di teachers ----------

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS certification_status TEXT NOT NULL DEFAULT 'belum',
  ADD COLUMN IF NOT EXISTS certification_type TEXT,
  ADD COLUMN IF NOT EXISTS certification_year INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_certification_status_check'
  ) THEN
    ALTER TABLE teachers
      ADD CONSTRAINT teachers_certification_status_check
      CHECK (certification_status IN ('belum', 'sudah'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_certification_year_check'
  ) THEN
    ALTER TABLE teachers
      ADD CONSTRAINT teachers_certification_year_check
      CHECK (
        certification_year IS NULL
        OR (certification_year >= 1945 AND certification_year <= 2100)
      );
  END IF;
END
$$;

-- Normalisasi baris lama: status belum tidak menyimpan jenis/tahun.
UPDATE teachers
SET certification_type = NULL, certification_year = NULL
WHERE certification_status = 'belum'
  AND (certification_type IS NOT NULL OR certification_year IS NOT NULL);

-- Guard: kolom sertifikasi hanya boleh diubah Kepala Sekolah.
-- (Kolom lain tetap mengikuti policy teachers_update existing.)
CREATE OR REPLACE FUNCTION guard_teacher_certification()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.certification_status IS DISTINCT FROM NEW.certification_status
    OR OLD.certification_type IS DISTINCT FROM NEW.certification_type
    OR OLD.certification_year IS DISTINCT FROM NEW.certification_year
  ) AND NOT (auth_user_role() = 'principal' OR auth_user_role() = 'admin') THEN
    RAISE EXCEPTION 'Hanya Kepala Sekolah yang dapat mengubah data sertifikasi';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_teacher_certification ON teachers;
CREATE TRIGGER trg_guard_teacher_certification
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION guard_teacher_certification();

-- ---------- 2. Tabel trainings ----------

CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  organizer TEXT,
  training_date DATE,
  schedule_time TEXT,
  location TEXT,
  duration_hours NUMERIC(6,2) CHECK (duration_hours IS NULL OR duration_hours >= 0),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainings_school_id ON trainings(school_id);
CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings(training_date);

DROP TRIGGER IF EXISTS update_trainings_updated_at ON trainings;
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON trainings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- 3. Tabel training_participants ----------

CREATE TABLE IF NOT EXISTS training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_training_participants_training_id
  ON training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_teacher_id
  ON training_participants(teacher_id);

-- ---------- 4. RLS ----------

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainings_select ON trainings;
CREATE POLICY trainings_select ON trainings
  FOR SELECT
  USING (school_id = auth_user_school_id() OR is_admin());

DROP POLICY IF EXISTS trainings_insert ON trainings;
CREATE POLICY trainings_insert ON trainings
  FOR INSERT
  WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

DROP POLICY IF EXISTS trainings_update ON trainings;
CREATE POLICY trainings_update ON trainings
  FOR UPDATE
  USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

DROP POLICY IF EXISTS trainings_delete ON trainings;
CREATE POLICY trainings_delete ON trainings
  FOR DELETE
  USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

DROP POLICY IF EXISTS training_participants_select ON training_participants;
CREATE POLICY training_participants_select ON training_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainings t
      WHERE t.id = training_participants.training_id
      AND t.school_id = auth_user_school_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS training_participants_insert ON training_participants;
CREATE POLICY training_participants_insert ON training_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainings t
      WHERE t.id = training_participants.training_id
      AND t.school_id = auth_user_school_id()
    ) AND (is_admin() OR is_principal())
  );

DROP POLICY IF EXISTS training_participants_update ON training_participants;
CREATE POLICY training_participants_update ON training_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trainings t
      WHERE t.id = training_participants.training_id
      AND t.school_id = auth_user_school_id()
    ) AND (is_admin() OR is_principal())
  );

DROP POLICY IF EXISTS training_participants_delete ON training_participants;
CREATE POLICY training_participants_delete ON training_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trainings t
      WHERE t.id = training_participants.training_id
      AND t.school_id = auth_user_school_id()
    ) AND (is_admin() OR is_principal())
  );
