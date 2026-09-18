-- =====================================================
-- SMART KASEK — Data Siswa: tahun ajaran + akses guru
-- =====================================================
-- 1. Tambah academic_year agar data siswa bisa dikelola per
--    tahun ajaran (filter + ganti tahun di aplikasi).
--    Baris lama (NULL) dianggap tahun berjalan oleh aplikasi.
-- 2. Beri guru (teacher) hak tulis se-SeKOLAH sendiri
--    (insert/update/delete) agar Kepala Sekolah dan Guru
--    sama-sama bisa mengelola data siswa. Isolasi sekolah
--    tetap dijaga via auth_user_school_id().
-- =====================================================

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS academic_year TEXT;

CREATE INDEX IF NOT EXISTS idx_students_academic_year
    ON students(academic_year);

CREATE INDEX IF NOT EXISTS idx_students_school_year
    ON students(school_id, academic_year);

DROP POLICY IF EXISTS students_insert ON students;
CREATE POLICY students_insert ON students
    FOR INSERT
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );

DROP POLICY IF EXISTS students_update ON students;
CREATE POLICY students_update ON students
    FOR UPDATE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    )
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );

DROP POLICY IF EXISTS students_delete ON students;
CREATE POLICY students_delete ON students
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );
