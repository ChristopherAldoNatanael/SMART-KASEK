-- =====================================================
-- SMART KASEK — Regenerate kode undangan sekolah
-- =====================================================
-- Masalah: kode undangan permanen sejak 00003. Bila bocor ke grup
-- WA / mantan guru, siapa pun bisa join dan tidak ada cara mencabut.
--
-- Fungsi ini (principal/admin sekolah sendiri) mengganti kode dengan
-- yang baru dari generate_invite_code(). Kode lama langsung mati —
-- join_school dengan kode lama gagal CODE_NOT_FOUND. Guru yang sudah
-- masuk tidak terpengaruh (mereka terikat school_id, bukan kode).
--
-- Aditif: tidak mengubah tabel, fungsi, atau RLS yang sudah ada.
-- Idempotent: aman dijalankan ulang (tiap panggil = kode baru).
-- =====================================================

CREATE OR REPLACE FUNCTION public.regenerate_invite_code()
RETURNS TEXT AS $$
DECLARE
    v_auth_id UUID := auth.uid();
    v_profile profiles%ROWTYPE;
    v_new_code TEXT;
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

    -- Loop aman dari collision UNIQUE (pola sama seperti backfill 00003).
    LOOP
        BEGIN
            v_new_code := generate_invite_code();
            UPDATE schools SET invite_code = v_new_code WHERE id = v_profile.school_id;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            -- coba lagi dengan kode lain
        END;
    END LOOP;

    RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.regenerate_invite_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code() TO authenticated;
