-- =====================================================
-- SMART KASEK — Principal dapat menghapus modul ajar sekolahnya
-- =====================================================
-- Policy lesson_plans_delete (00002) hanya mengizinkan guru pemilik
-- dan admin. Kepala Sekolah yang melihat seluruh modul sekolahnya
-- (lesson_plans_select) juga perlu hak hapus untuk moderasi.
-- Pola ini mengikuti lesson_plans_insert/update yang sudah
-- menyertakan is_principal().
-- =====================================================

DROP POLICY IF EXISTS lesson_plans_delete ON lesson_plans;

CREATE POLICY lesson_plans_delete ON lesson_plans
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = lesson_plans.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );
