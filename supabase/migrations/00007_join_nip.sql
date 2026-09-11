-- =====================================================
-- SMART KASEK — NIP saat guru bergabung (ronde-16)
-- =====================================================
-- Form gabung mengumpulkan NIP; disimpan ke teachers.nip
-- dalam transaksi yang sama dengan pembuatan baris teachers.
-- Aditif & backward-compatible (parameter DEFAULT NULL).
-- =====================================================

CREATE OR REPLACE FUNCTION join_school(
    p_code TEXT,
    p_subject TEXT DEFAULT NULL,
    p_homeroom_class TEXT DEFAULT NULL,
    p_nip TEXT DEFAULT NULL
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
        INSERT INTO teachers (profile_id, school_id, subject, homeroom_class, nip, employment_status)
        VALUES (
            v_profile.id,
            v_school.id,
            NULLIF(trim(COALESCE(p_subject, '')), ''),
            NULLIF(trim(COALESCE(p_homeroom_class, '')), ''),
            NULLIF(trim(COALESCE(p_nip, '')), ''),
            'active'
        )
        ON CONFLICT (profile_id) DO UPDATE SET
            school_id = EXCLUDED.school_id,
            subject = COALESCE(EXCLUDED.subject, teachers.subject),
            homeroom_class = COALESCE(EXCLUDED.homeroom_class, teachers.homeroom_class),
            nip = COALESCE(EXCLUDED.nip, teachers.nip);
    END IF;

    RETURN v_school;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION join_school(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_school(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Hapus signature sebelumnya agar satu sumber kebenaran.
DROP FUNCTION IF EXISTS join_school(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS join_school(TEXT);
