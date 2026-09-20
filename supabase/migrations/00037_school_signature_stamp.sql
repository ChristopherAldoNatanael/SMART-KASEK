-- =====================================================
-- SMART KASEK — Tanda tangan & stempel dokumen
-- =====================================================
-- Dokumen cetak (mis. Program Kegiatan Semester) memakai tanda
-- tangan Kepala Sekolah + stempel sekolah. Keduanya diunggah sekali
-- lewat Pengaturan, disimpan di bucket Storage `school-docs`
-- (pola yang sama seperti logo di `school-logos`).
-- RPC update_school diperluas (drop overload lama agar tidak ambigu).
-- Aman: kolom nullable, tanpa mengubah data existing.
-- =====================================================

ALTER TABLE schools ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS stamp_url TEXT;

-- Bucket dokumen (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-docs', 'school-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Baca publik untuk dokumen.
DROP POLICY IF EXISTS "school_docs_public_read" ON storage.objects;
CREATE POLICY "school_docs_public_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'school-docs');

-- Tulis hanya di folder sekolah sendiri + peran principal/admin.
DROP POLICY IF EXISTS "school_docs_principal_write" ON storage.objects;
CREATE POLICY "school_docs_principal_write" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'school-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );

DROP POLICY IF EXISTS "school_docs_principal_update" ON storage.objects;
CREATE POLICY "school_docs_principal_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'school-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );

DROP POLICY IF EXISTS "school_docs_principal_delete" ON storage.objects;
CREATE POLICY "school_docs_principal_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'school-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );

-- RPC: tambah 2 param di belakang agar kompatibel ke depan.
DROP FUNCTION IF EXISTS update_school(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT);

CREATE OR REPLACE FUNCTION update_school(
    p_name TEXT,
    p_npsn TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_village TEXT DEFAULT NULL,
    p_district TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_province TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_principal_name TEXT DEFAULT NULL,
    p_principal_nip TEXT DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_logo_size INT DEFAULT NULL,
    p_signature_url TEXT DEFAULT NULL,
    p_stamp_url TEXT DEFAULT NULL
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

    SELECT * INTO v_profile FROM profiles WHERE auth_user_id = v_auth_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NO_PROFILE';
    END IF;

    IF v_profile.role NOT IN ('principal', 'admin') THEN
        RAISE EXCEPTION 'FORBIDDEN_NOT_PRINCIPAL';
    END IF;

    IF v_profile.school_id IS NULL THEN
        RAISE EXCEPTION 'NO_SCHOOL';
    END IF;

    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'INVALID_NAME';
    END IF;

    IF p_logo_size IS NOT NULL AND (p_logo_size < 24 OR p_logo_size > 64) THEN
        RAISE EXCEPTION 'INVALID_LOGO_SIZE';
    END IF;

    UPDATE schools SET
        name = trim(p_name),
        npsn = NULLIF(trim(COALESCE(p_npsn, '')), ''),
        address = NULLIF(trim(COALESCE(p_address, '')), ''),
        village = NULLIF(trim(COALESCE(p_village, '')), ''),
        district = NULLIF(trim(COALESCE(p_district, '')), ''),
        city = NULLIF(trim(COALESCE(p_city, '')), ''),
        province = NULLIF(trim(COALESCE(p_province, '')), ''),
        phone = NULLIF(trim(COALESCE(p_phone, '')), ''),
        email = NULLIF(trim(COALESCE(p_email, '')), ''),
        principal_name = NULLIF(trim(COALESCE(p_principal_name, '')), ''),
        principal_nip = NULLIF(trim(COALESCE(p_principal_nip, '')), ''),
        logo_url = CASE WHEN p_logo_url IS NULL THEN logo_url ELSE NULLIF(trim(p_logo_url), '') END,
        logo_size = COALESCE(p_logo_size, logo_size),
        signature_url = CASE WHEN p_signature_url IS NULL THEN signature_url ELSE NULLIF(trim(p_signature_url), '') END,
        stamp_url = CASE WHEN p_stamp_url IS NULL THEN stamp_url ELSE NULLIF(trim(p_stamp_url), '') END,
        updated_at = NOW()
    WHERE id = v_profile.school_id
    RETURNING * INTO v_school;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NO_SCHOOL';
    END IF;

    RETURN v_school;
EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'NPSN_TAKEN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION update_school(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_school(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT) TO authenticated;
