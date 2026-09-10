-- =====================================================
-- SMART KASEK — Onboarding dua role (Kepala Sekolah + Guru)
-- =====================================================
-- Prinsip:
-- - TIDAK menambah role baru; enum user_role tidak diubah.
-- - TIDAK mengubah RLS yang sudah ada.
-- - State "belum bersekolah" harus representable di skema.
-- - Pembuatan sekolah & gabung sekolah berjalan lewat fungsi
--   SECURITY DEFINER karena policy schools_insert mensyaratkan
--   is_admin() dan user baru belum punya sekolah.
-- =====================================================

-- 1. Profil boleh belum terhubung ke sekolah (state onboarding).
--    Idempotent: no-op bila kolom sudah nullable.
ALTER TABLE profiles ALTER COLUMN school_id DROP NOT NULL;

-- 2. Kode undangan sekolah untuk mekanisme "Gabung ke Sekolah".
ALTER TABLE schools ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substr(alphabet, (random() * 31)::int + 1, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill sekolah yang sudah ada (loop aman dari collision UNIQUE).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM schools WHERE invite_code IS NULL LOOP
        LOOP
            BEGIN
                UPDATE schools SET invite_code = generate_invite_code() WHERE id = r.id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- coba lagi dengan kode lain
            END;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE schools ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE schools ALTER COLUMN invite_code SET DEFAULT generate_invite_code();

-- =====================================================
-- 3. ensure_profile(p_role): buat profil bila belum ada.
--    p_role HANYA 'principal' | 'teacher' (dua role aplikasi).
-- =====================================================
CREATE OR REPLACE FUNCTION ensure_profile(p_role TEXT)
RETURNS profiles AS $$
DECLARE
    v_auth_id UUID := auth.uid();
    v_profile profiles%ROWTYPE;
    v_email TEXT;
    v_name TEXT;
BEGIN
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_role NOT IN ('principal', 'teacher') THEN
        RAISE EXCEPTION 'INVALID_ROLE';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE auth_user_id = v_auth_id;
    IF FOUND THEN
        RETURN v_profile;
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_auth_id;
    v_name := COALESCE(
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
        split_part(COALESCE(v_email, 'Pengguna'), '@', 1)
    );

    INSERT INTO profiles (auth_user_id, school_id, full_name, email, role)
    VALUES (v_auth_id, NULL, v_name, COALESCE(v_email, ''), p_role::user_role)
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. create_school: Kepala Sekolah membuat sekolah + otomatis
--    terhubung sebagai sekolahnya.
-- =====================================================
CREATE OR REPLACE FUNCTION create_school(
    p_name TEXT,
    p_npsn TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS schools AS $$
DECLARE
    v_auth_id UUID := auth.uid();
    v_profile profiles%ROWTYPE;
    v_school schools%ROWTYPE;
BEGIN
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'INVALID_NAME';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE auth_user_id = v_auth_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NO_PROFILE';
    END IF;

    IF v_profile.role NOT IN ('principal', 'admin') THEN
        RAISE EXCEPTION 'FORBIDDEN_NOT_PRINCIPAL';
    END IF;

    IF v_profile.school_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_LINKED';
    END IF;

    INSERT INTO schools (name, npsn, address, phone, email)
    VALUES (
        trim(p_name),
        NULLIF(trim(COALESCE(p_npsn, '')), ''),
        NULLIF(trim(COALESCE(p_address, '')), ''),
        NULLIF(trim(COALESCE(p_phone, '')), ''),
        NULLIF(trim(COALESCE(p_email, '')), '')
    )
    RETURNING * INTO v_school;

    UPDATE profiles SET school_id = v_school.id WHERE id = v_profile.id;

    RETURN v_school;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 5. join_school: Guru (atau principal tanpa sekolah) gabung
--    via kode undangan. Membuat baris teachers bila role teacher.
--    Single-school: profil yang sudah terhubung DITOLAK.
-- =====================================================
CREATE OR REPLACE FUNCTION join_school(p_code TEXT)
RETURNS schools AS $$
DECLARE
    v_auth_id UUID := auth.uid();
    v_profile profiles%ROWTYPE;
    v_school schools%ROWTYPE;
BEGIN
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
        RAISE EXCEPTION 'INVALID_CODE';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE auth_user_id = v_auth_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NO_PROFILE';
    END IF;

    IF v_profile.school_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_LINKED';
    END IF;

    SELECT * INTO v_school FROM schools WHERE invite_code = upper(trim(p_code));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'CODE_NOT_FOUND';
    END IF;

    UPDATE profiles SET school_id = v_school.id WHERE id = v_profile.id;

    IF v_profile.role = 'teacher' THEN
        INSERT INTO teachers (profile_id, school_id, employment_status)
        VALUES (v_profile.id, v_school.id, 'active')
        ON CONFLICT (profile_id) DO UPDATE SET school_id = EXCLUDED.school_id;
    END IF;

    RETURN v_school;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC hanya boleh dipanggil user login (bukan anon/service_role).
REVOKE ALL ON FUNCTION ensure_profile(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_school(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION join_school(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ensure_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_school(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_school(TEXT) TO authenticated;
