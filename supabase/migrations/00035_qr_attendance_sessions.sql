-- =====================================================
-- SMART KASEK — QR Absensi Digital per sesi/per kelas
-- =====================================================
-- Konsep: CLASS -> ATTENDANCE SESSION -> QR CODE -> RECORD.
-- REUSE: class_attendance tetap source of truth rekap.
-- - attendance_sessions: 1 baris = 1 sesi buka/tutup oleh guru.
--   Token QR acak (qr_token) unik, tidak memakai ID incremental
--   sebagai secret, hanya berlaku selama status = 'open'.
-- - class_attendance.session_id: tautan opsional ke sesi QR.
--   NULL = input manual guru (backward compatible).
--   UNIQUE(session_id, student_id): 1 siswa 1 record per sesi
--   (proteksi race condition di level database).
-- - UNIQUE(student_id, date) dipertahankan: MVP 1 sesi per
--   kelas per hari agar rekap harian existing tetap valid.
--   Multi-sesi per hari butuh keputusan produk lanjutan.
-- - Status 'terlambat' ditambahkan untuk kebutuhan QR
--   (server time > late_after). Rekap menghitung
--   hadir + terlambat sebagai kehadiran.
-- =====================================================

-- 1. Status terlambat (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'class_attendance_status_check'
  ) THEN
    ALTER TABLE class_attendance DROP CONSTRAINT class_attendance_status_check;
  END IF;
END $$;

ALTER TABLE class_attendance
  ADD CONSTRAINT class_attendance_status_check
  CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpa'));

-- 2. Tabel sesi absensi QR.
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  date DATE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Absensi Pagi',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  late_after TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  qr_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_school_date
  ON attendance_sessions(school_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_token
  ON attendance_sessions(qr_token);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class
  ON attendance_sessions(school_id, class_name, date);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Baca: satu sekolah.
DROP POLICY IF EXISTS attendance_sessions_select ON attendance_sessions;
CREATE POLICY attendance_sessions_select ON attendance_sessions
  FOR SELECT
  USING (school_id = auth_user_school_id() OR is_admin());

-- Tulis: Kepala Sekolah + Guru se-sekolah sendiri.
DROP POLICY IF EXISTS attendance_sessions_insert ON attendance_sessions;
CREATE POLICY attendance_sessions_insert ON attendance_sessions
  FOR INSERT
  WITH CHECK (
    school_id = auth_user_school_id()
    AND (is_admin() OR is_principal() OR is_teacher())
  );

DROP POLICY IF EXISTS attendance_sessions_update ON attendance_sessions;
CREATE POLICY attendance_sessions_update ON attendance_sessions
  FOR UPDATE
  USING (
    school_id = auth_user_school_id()
    AND (is_admin() OR is_principal() OR is_teacher())
  )
  WITH CHECK (
    school_id = auth_user_school_id()
    AND (is_admin() OR is_principal() OR is_teacher())
  );

DROP POLICY IF EXISTS attendance_sessions_delete ON attendance_sessions;
CREATE POLICY attendance_sessions_delete ON attendance_sessions
  FOR DELETE
  USING (
    school_id = auth_user_school_id()
    AND (is_admin() OR is_principal() OR is_teacher())
  );

-- 3. Tautan sesi di tabel absensi (opsional, backward compatible).
ALTER TABLE class_attendance
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL;

ALTER TABLE class_attendance
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NULL;

ALTER TABLE class_attendance
  ADD COLUMN IF NOT EXISTS check_in_method TEXT NOT NULL DEFAULT 'manual'
  CHECK (check_in_method IN ('manual', 'qr'));

CREATE INDEX IF NOT EXISTS idx_attendance_session
  ON class_attendance(session_id);

-- 1 siswa 1 record per sesi (NULL session_id dikecualikan otomatis oleh UNIQUE).
DROP INDEX IF EXISTS uq_attendance_session_student;
CREATE UNIQUE INDEX uq_attendance_session_student
  ON class_attendance(session_id, student_id);
