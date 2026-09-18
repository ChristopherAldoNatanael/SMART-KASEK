-- =====================================================
-- SMART KASEK — Kelas yang diajar guru mapel
-- =====================================================
-- Wali kelas sudah tercatat di teachers.homeroom_class.
-- Guru mapel butuh daftar "kelas yang saya ajar + mapel apa"
-- agar halaman Rekap Absensi bisa langsung menampilkan
-- kelasnya tanpa menghafal nama kelas.
-- Diisi mandiri oleh guru (self-service), 1 baris = 1 kelas
-- + 1 mapel pada 1 tahun ajaran. Kepala Sekolah bisa
-- melihat semua (SELECT se-sekolah).
-- =====================================================

CREATE TABLE IF NOT EXISTS teaching_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teacher_id, class_name, subject, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_assignments_school
    ON teaching_assignments(school_id);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher
    ON teaching_assignments(teacher_id);

ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;

-- Baca: satu sekolah.
CREATE POLICY assignments_select ON teaching_assignments
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Tulis: pemilik baris (guru itu sendiri) atau Kepsek/Admin.
-- Cek pemilik lewat teachers + profiles (tanpa self-join agar
-- tidak terjadi infinite recursion).
CREATE POLICY assignments_insert ON teaching_assignments
    FOR INSERT
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (
            is_admin() OR is_principal()
            OR EXISTS (
                SELECT 1 FROM teachers t
                JOIN profiles p ON p.id = t.profile_id
                WHERE t.id = teaching_assignments.teacher_id
                AND p.auth_user_id = auth.uid()
                AND t.school_id = auth_user_school_id()
            )
        )
    );

CREATE POLICY assignments_update ON teaching_assignments
    FOR UPDATE
    USING (
        school_id = auth_user_school_id()
        AND (
            is_admin() OR is_principal()
            OR EXISTS (
                SELECT 1 FROM teachers t
                JOIN profiles p ON p.id = t.profile_id
                WHERE t.id = teaching_assignments.teacher_id
                AND p.auth_user_id = auth.uid()
                AND t.school_id = auth_user_school_id()
            )
        )
    )
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (
            is_admin() OR is_principal()
            OR EXISTS (
                SELECT 1 FROM teachers t
                JOIN profiles p ON p.id = t.profile_id
                WHERE t.id = teaching_assignments.teacher_id
                AND p.auth_user_id = auth.uid()
                AND t.school_id = auth_user_school_id()
            )
        )
    );

CREATE POLICY assignments_delete ON teaching_assignments
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (
            is_admin() OR is_principal()
            OR EXISTS (
                SELECT 1 FROM teachers t
                JOIN profiles p ON p.id = t.profile_id
                WHERE t.id = teaching_assignments.teacher_id
                AND p.auth_user_id = auth.uid()
                AND t.school_id = auth_user_school_id()
            )
        )
    );
