-- =====================================================
-- SMART KASEK — Kepala Sekolah boleh menghapus guru
-- =====================================================
-- Sebelumnya teachers/profiles hanya bisa dihapus admin,
-- sehingga tombol "Hapus guru" tidak akan pernah jalan untuk
-- Kepala Sekolah. Migrasi ini membuka hapus untuk principal
-- SE-SEKOLAH sendiri, dengan batasan:
-- - Profil yang boleh dihapus principal hanya role 'teacher'
--   (profil kepsek/admin lain tidak tersentuh).
-- - Cegah hapus akun sendiri ditangani di service layer
--   (butuh perbandingan user login, tak bisa di RLS).
--
-- Dampak hapus (via CASCADE/SET NULL yang sudah ada):
-- ikut terhapus: supervisi, coaching, nilai kompetensi,
-- growth, modul/jurnal/asesmen, daftar ajar, dokumen.
-- Dinullkan: referensi penilai (supervisor, recorded_by, dsb).
-- Akun login (auth) TIDAK dihapus (tanpa service key);
-- login berikutnya diarahkan ke onboarding.
-- =====================================================

DROP POLICY IF EXISTS teachers_delete ON teachers;
CREATE POLICY teachers_delete ON teachers
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal())
    );

DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_delete ON profiles
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR (is_principal() AND role = 'teacher'))
    );
