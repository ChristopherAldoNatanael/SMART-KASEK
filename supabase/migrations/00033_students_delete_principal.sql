-- =====================================================
-- SMART KASEK — Penyelarasan RLS hapus data siswa
-- =====================================================
-- Service layer:
-- - deleteStudent() mengizinkan teacher (hapus per baris,
--   dipakai guru di tabel Data Siswa milik sekolahnya).
-- - bulkDeleteStudents() dibatasi principal/admin di service
--   (panel "Hapus Data Kelas" hanya dirender untuk Kepsek).
-- Kebijakan ini menegaskan ketiganya (admin/principal/teacher)
-- SE-SEKOLAH sendiri agar RLS selaras dengan service layer.
-- Isolasi sekolah tetap dijaga via auth_user_school_id().
-- =====================================================

DROP POLICY IF EXISTS students_delete ON students;
CREATE POLICY students_delete ON students
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );
