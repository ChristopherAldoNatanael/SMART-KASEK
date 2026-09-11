-- =====================================================
-- SMART KASEK — Guru boleh mengubah data miliknya sendiri
-- =====================================================
-- Masalah: policy teachers_update & profiles_update hanya
-- mengizinkan admin/principal. Guru yang menyimpan Data Pokok
-- mendapat 0 baris ter-update → PostgREST error samar:
-- "Cannot coerce the result to a single JSON object".
--
-- Solusi: tambah cabang self-service di USING, dengan WITH CHECK
-- yang mengunci kolom privilege (role, school_id, is_active,
-- profile_id) agar tidak bisa dieskalasi. Principal/admin tidak
-- berubah perilakunya.
-- =====================================================

DROP POLICY IF EXISTS teachers_update ON teachers;
CREATE POLICY teachers_update ON teachers
    FOR UPDATE
    USING (
        (school_id = auth_user_school_id() AND (is_admin() OR is_principal()))
        OR profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (
        is_admin() OR is_principal()
        OR (
            school_id = auth_user_school_id()
            AND profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    USING (
        (school_id = auth_user_school_id() AND (is_admin() OR is_principal()))
        OR auth_user_id = auth.uid()
    )
    WITH CHECK (
        is_admin() OR is_principal()
        OR (
            auth_user_id = auth.uid()
            AND school_id = auth_user_school_id()
            AND role = auth_user_role()
            AND is_active = (
                SELECT p.is_active FROM profiles p
                WHERE p.auth_user_id = auth.uid()
            )
        )
    );
