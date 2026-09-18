-- =====================================================
-- SMART KASEK — Absensi harian per kelas
-- =====================================================
-- Satu baris = 1 siswa + 1 tanggal. Status memakai singkatan
-- yang sudah familiar di sekolah: H/I/S/A.
-- Relasi dijaga ke sekolah via siswa induk; recorded_by opsional
-- (profil pencatat, boleh null bila profil dihapus).
-- UNIQUE (student_id, date): 1 siswa hanya 1 status per hari,
-- simpan ulang = koreksi (upsert dari aplikasi).
-- =====================================================

CREATE TABLE IF NOT EXISTS class_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_name TEXT,
    academic_year TEXT,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'hadir'
        CHECK (status IN ('hadir', 'izin', 'sakit', 'alpa')),
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_school_date
    ON class_attendance(school_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_student
    ON class_attendance(student_id);

ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;

-- Baca: satu sekolah (guru mapel & wali kelas butuh membaca).
CREATE POLICY attendance_select ON class_attendance
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Tulis: Kepala Sekolah + Guru se-sekolah sendiri.
CREATE POLICY attendance_insert ON class_attendance
    FOR INSERT
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );

CREATE POLICY attendance_update ON class_attendance
    FOR UPDATE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    )
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );

CREATE POLICY attendance_delete ON class_attendance
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );
