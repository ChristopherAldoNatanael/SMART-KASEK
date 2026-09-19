-- =====================================================
-- SMART KASEK — Pengguna boleh mengubah profil sendiri
-- =====================================================
-- Sebelumnya profiles_update hanya untuk admin/principal,
-- sehingga guru tidak bisa mengganti namanya sendiri di
-- "Akun Saya". Dibuka untuk baris milik sendiri
-- (auth_user_id = auth.uid()), tetap dalam sekolah yang sama
-- (WITH CHECK) agar tidak bisa pindah sekolah lewat sini.
-- Peran (role) TIDAK bisa diubah dari sini — kolom role tidak
-- disentuh service (hanya full_name & email).
-- =====================================================

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR auth_user_id = auth.uid())
    )
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR auth_user_id = auth.uid())
    );
