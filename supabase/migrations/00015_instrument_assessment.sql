-- =====================================================
-- SMART KASEK — Penilaian instrumen 12 aspek supervisi
-- =====================================================
-- Instrumen: 12 aspek (sama persis dengan doc_type dokumen),
-- tiap aspek: Ada/Tidak + skor 1-4 + catatan.
-- Nilai = (jumlah skor / 48) x 100, kategori:
-- 91-100 Amat Baik, 81-90 Baik, 71-80 Cukup, <71 Kurang.
--
-- Terpisah dari supervision_items (skala 0-100): tidak menyentuh
-- fitur penilaian lama maupun upload dokumen.
-- Satu penilaian per supervisi (UNIQUE supervision_id).
-- Status draft/final milik baris penilaian; alur supervisi
-- (draft/completed/...) tetap seperti semula.
-- =====================================================

CREATE TABLE supervision_instrument_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervision_id UUID NOT NULL UNIQUE REFERENCES supervisions(id) ON DELETE CASCADE,
    class_name TEXT,
    evaluator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    total_score INT NOT NULL DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 48),
    final_value NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (final_value >= 0 AND final_value <= 100),
    grade TEXT NOT NULL DEFAULT 'Kurang' CHECK (grade IN ('Amat Baik', 'Baik', 'Cukup', 'Kurang')),
    evaluation TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_supervision_instrument_assessments_updated_at
    BEFORE UPDATE ON supervision_instrument_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE supervision_instrument_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES supervision_instrument_assessments(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN (
        'cp', 'atp', 'prota', 'promes', 'modul_ajar',
        'kokurikuler', 'penilaian', 'daftar_hadir',
        'jurnal', 'daftar_nilai', 'kalender', 'jadwal'
    )),
    present BOOLEAN NOT NULL DEFAULT FALSE,
    score INT CHECK (score IS NULL OR (score >= 1 AND score <= 4)),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, doc_type)
);

CREATE INDEX idx_instrument_items_assessment_id
    ON supervision_instrument_items(assessment_id);

ALTER TABLE supervision_instrument_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_instrument_items ENABLE ROW LEVEL SECURITY;

-- Baca: satu sekolah via supervisi induk (guru dibatasi miliknya
-- di service layer, sama seperti dokumen supervisi).
CREATE POLICY instrument_assessments_select ON supervision_instrument_assessments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_instrument_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY instrument_items_select ON supervision_instrument_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supervision_instrument_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_instrument_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

-- Tulis: principal/admin sekolah (penilai = supervisor).
CREATE POLICY instrument_assessments_insert ON supervision_instrument_assessments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_instrument_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY instrument_assessments_update ON supervision_instrument_assessments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_instrument_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_instrument_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY instrument_assessments_delete ON supervision_instrument_assessments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_instrument_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY instrument_items_insert ON supervision_instrument_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervision_instrument_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_instrument_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY instrument_items_update ON supervision_instrument_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervision_instrument_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_instrument_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervision_instrument_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_instrument_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY instrument_items_delete ON supervision_instrument_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervision_instrument_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_instrument_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );
