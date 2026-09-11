-- =====================================================
-- SMART KASEK — Wali Kelas pada data guru (ronde-14)
-- =====================================================
-- Keputusan desain (terdokumentasi, bukan asumsi):
-- - Tidak ada tabel master kelas di sistem (students.class_name
--   berupa teks bebas), sehingga relasi FK ke "kelas" adalah
--   overengineering.
-- - Boolean saja tidak cukup karena UI harus menampilkan KELAS
--   yang diampu dari data aktual.
-- - Maka: satu kolom nullable teachers.homeroom_class.
--   NULL = bukan wali kelas (boleh kosong/nonaktif).
--   Terisi = wali kelas dari kelas tersebut.
-- - Kolom subject sudah nullable, sehingga wali kelas tanpa
--   mapel tertentu dimungkinkan oleh skema.
-- - Aditif & backward-compatible: tidak ada NOT NULL, tidak ada
--   default pemaksa, tidak ada data existing yang berubah.
-- =====================================================

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS homeroom_class TEXT;

-- join_school: terima mapel + kelas wali opsional saat guru bergabung.
-- Parameter DEFAULT NULL menjaga kompatibilitas pemanggil lama.
CREATE OR REPLACE FUNCTION join_school(
    p_code TEXT,
    p_subject TEXT DEFAULT NULL,
    p_homeroom_class TEXT DEFAULT NULL
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
        INSERT INTO teachers (profile_id, school_id, subject, homeroom_class, employment_status)
        VALUES (
            v_profile.id,
            v_school.id,
            NULLIF(trim(COALESCE(p_subject, '')), ''),
            NULLIF(trim(COALESCE(p_homeroom_class, '')), ''),
            'active'
        )
        ON CONFLICT (profile_id) DO UPDATE SET
            school_id = EXCLUDED.school_id,
            subject = COALESCE(EXCLUDED.subject, teachers.subject),
            homeroom_class = COALESCE(EXCLUDED.homeroom_class, teachers.homeroom_class);
    END IF;

    RETURN v_school;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION join_school(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_school(TEXT, TEXT, TEXT) TO authenticated;

-- Hapus signature lama agar hanya satu sumber kebenaran.
DROP FUNCTION IF EXISTS join_school(TEXT);
