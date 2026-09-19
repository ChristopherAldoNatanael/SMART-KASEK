-- =====================================================
-- SMART KASEK — Keputusan Kenaikan Kelas (berbasis rekomendasi)
-- =====================================================
-- BUKAN aturan otomatis: tidak ada threshold nilai/kehadiran di
-- sini. Alur manusia: wali kelas memberi rekomendasi →
-- Kepala Sekolah memverifikasi & menetapkan.
--
-- Status (snake_case, konvensi project):
--   draft     = wali menyusun rekomendasi
--   submitted = menunggu verifikasi Kepala Sekolah
--   returned  = dikembalikan ke wali (beserta catatan)
--   decided   = sudah ditetapkan (final, terkunci)
-- Rekomendasi: naik | tidak_naik | pertimbangan (boleh null saat draft).
-- Keputusan final: naik | tidak_naik (hanya saat decided).
-- UNIQUE(student_id, academic_year): 1 siswa 1 keputusan final/tahun.
-- =====================================================

CREATE TABLE IF NOT EXISTS promotion_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    class_name TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    homeroom_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    recommendation TEXT CHECK (recommendation IS NULL OR recommendation IN ('naik', 'tidak_naik', 'pertimbangan')),
    recommendation_note TEXT,
    recommended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    recommended_at TIMESTAMPTZ,
    final_decision TEXT CHECK (final_decision IS NULL OR final_decision IN ('naik', 'tidak_naik')),
    principal_note TEXT,
    decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'returned', 'decided')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_promotion_school_year
    ON promotion_decisions(school_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_promotion_status
    ON promotion_decisions(status);

CREATE TRIGGER update_promotion_decisions_updated_at
    BEFORE UPDATE ON promotion_decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE promotion_decisions ENABLE ROW LEVEL SECURITY;

-- Baca: satu sekolah (wali/mapel baca yang menjadi haknya via service).
CREATE POLICY promotion_select ON promotion_decisions
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Tulis: Kepala Sekolah/Admin + guru se-sekolah (wali vs kelas
-- lain dibatasi di service layer, pola yang sama dipakai modul siswa).
CREATE POLICY promotion_insert ON promotion_decisions
    FOR INSERT
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );

CREATE POLICY promotion_update ON promotion_decisions
    FOR UPDATE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    )
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal() OR is_teacher())
    );

CREATE POLICY promotion_delete ON promotion_decisions
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal())
    );
