-- =====================================================
-- SMART KASEK — Koreksi peran saat onboarding + foto profil
-- =====================================================
-- 1. switch_profile_role(p_role): izinkan user yang SALAH PILIH
--    peran saat onboarding (school_id IS NULL) untuk berganti
--    peran tanpa daftar ulang / tanpa hapus akun auth.
--    - HANYA principal | teacher
--    - DITOLAK bila sudah terhubung ke sekolah (ALREADY_LINKED)
--      agar tidak bisa kabur dari otorisasi sekolah.
-- 2. Bucket `avatars` (public, maks 2 MB, gambar saja) untuk
--    foto profil custom. Path: <auth_uid>/<timestamp>.<ext>
-- =====================================================

-- ---------- 1. RPC ganti peran (onboarding saja) ----------
CREATE OR REPLACE FUNCTION switch_profile_role(p_role TEXT)
RETURNS profiles AS $$
DECLARE
    v_auth_id UUID := auth.uid();
    v_profile profiles%ROWTYPE;
BEGIN
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_role NOT IN ('principal', 'teacher') THEN
        RAISE EXCEPTION 'INVALID_ROLE';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE auth_user_id = v_auth_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NO_PROFILE';
    END IF;

    IF v_profile.school_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_LINKED';
    END IF;

    IF v_profile.role = p_role::user_role THEN
        RETURN v_profile;
    END IF;

    UPDATE profiles
    SET role = p_role::user_role, updated_at = NOW()
    WHERE id = v_profile.id
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION switch_profile_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION switch_profile_role(TEXT) TO authenticated;

-- ---------- 2. Bucket avatars ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bersihkan policy lama bila migrasi dijalankan ulang.
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

-- Upload: hanya folder milik sendiri (<auth_uid>/...)
CREATE POLICY "avatars_insert_own" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Baca: publik (bucket public) — foto tampil di top nav tanpa signed URL.
CREATE POLICY "avatars_select_public" ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'avatars');

-- Ganti / hapus: hanya pemilik folder.
CREATE POLICY "avatars_update_own" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "avatars_delete_own" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
