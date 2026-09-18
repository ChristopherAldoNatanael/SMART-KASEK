-- =====================================================
-- SMART KASEK — Master Kelas per sekolah
-- =====================================================
-- Kepala Sekolah mengatur daftar kelas (I-A … VI-B) sekali saja.
-- Daftar ini menjadi sumber dropdown di:
-- - Form gabung guru (wali kelas + kelas yang diajar)
-- - Dialog wali kelas & "kelas yang saya ajar"
-- - Saran kelas pada form siswa & kenaikan kelas
--
-- Kolom teks existing (students.class_name, teachers.homeroom_class,
-- dst.) SENGAJA tidak dijadikan FK agar data lama/import dengan
-- penulisan sedikit berbeda tetap tersimpan (dropdown bersifat
-- mengarahkan, bukan mengunci).
-- =====================================================

CREATE TABLE IF NOT EXISTS school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_school_classes_school
    ON school_classes(school_id);

ALTER TABLE school_classes ENABLE ROW LEVEL SECURITY;

-- Baca: semua anggota sekolah (dropdown butuh dibaca guru juga).
CREATE POLICY school_classes_select ON school_classes
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Tulis: hanya Kepala Sekolah/Admin.
CREATE POLICY school_classes_insert ON school_classes
    FOR INSERT
    WITH CHECK (
        school_id = auth_user_school_id() AND (is_admin() OR is_principal())
    );

CREATE POLICY school_classes_update ON school_classes
    FOR UPDATE
    USING (
        school_id = auth_user_school_id() AND (is_admin() OR is_principal())
    )
    WITH CHECK (
        school_id = auth_user_school_id() AND (is_admin() OR is_principal())
    );

CREATE POLICY school_classes_delete ON school_classes
    FOR DELETE
    USING (
        school_id = auth_user_school_id() AND (is_admin() OR is_principal())
    );

-- =====================================================
-- Info sekolah + daftar kelas untuk form gabung guru.
-- Dipanggil SEBELUM bergabung (belum se-sekolah), sehingga
-- memakai SECURITY DEFINER + kode undangan, bukan RLS.
-- Hanya mengembalikan nama sekolah + nama kelas aktif.
-- =====================================================

CREATE OR REPLACE FUNCTION get_join_school_info(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_school schools%ROWTYPE;
    v_classes TEXT[];
BEGIN
    IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
        RAISE EXCEPTION 'INVALID_CODE';
    END IF;

    SELECT * INTO v_school FROM schools WHERE invite_code = upper(trim(p_code));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'CODE_NOT_FOUND';
    END IF;

    SELECT COALESCE(array_agg(name ORDER BY name), '{}') INTO v_classes
    FROM school_classes
    WHERE school_id = v_school.id AND is_active = TRUE;

    RETURN jsonb_build_object(
        'school_name', v_school.name,
        'classes', to_jsonb(v_classes)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_join_school_info(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_join_school_info(TEXT) TO authenticated;

-- =====================================================
-- join_school: validasi wali terhadap master kelas.
-- Bila sekolah SUDAH mengatur daftar kelas dan pilihan wali
-- tidak ada di daftar (mis. request rakitan), simpan NULL
-- agar peta wali tidak menunjuk kelas yang tidak dikenal.
-- Bila sekolah BELUM mengatur daftar, perilaku lama dipertahankan.
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
    v_homeroom TEXT;
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

    v_homeroom := NULLIF(trim(COALESCE(p_homeroom_class, '')), '');
    IF v_homeroom IS NOT NULL
        AND EXISTS (SELECT 1 FROM school_classes WHERE school_id = v_school.id AND is_active = TRUE)
        AND NOT EXISTS (
            SELECT 1 FROM school_classes
            WHERE school_id = v_school.id AND is_active = TRUE AND name = v_homeroom
        )
    THEN
        v_homeroom := NULL;
    END IF;

    IF v_profile.role = 'teacher' THEN
        INSERT INTO teachers (profile_id, school_id, subject, homeroom_class, nip, employment_status)
        VALUES (
            v_profile.id,
            v_school.id,
            NULLIF(trim(COALESCE(p_subject, '')), ''),
            v_homeroom,
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
