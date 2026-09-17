-- =====================================================
-- SMART KASEK — Supervisi Manajerial (PDF UPT SDN 226 Gresik 2026/2027)
-- =====================================================
-- Menambah jenis supervisi manajerial TANPA menyentuh fitur
-- supervisi akademik/administrasi pembelajaran yang sudah berjalan:
--
-- - supervisions: kolom kind + academic_year + period.
--   Baris existing otomatis kind='academic' via DEFAULT.
-- - Tabel baru supervision_managerial_assessments (1 per supervisi)
--   + supervision_managerial_items (34 indikator: 13 skor + 10 Ada/Tidak
--   + 11 skor). Tidak memakai ulang supervision_instrument_* karena
--   CHECK doc_type di sana terbatas pada 12 tipe dokumen akademik.
--
-- Rumus (BAB IV PDF):
-- - I1/I3: Nilai = (perolehan / maksimal) x 100 (maks I1=52, I3=44).
-- - I2: Ada=1/Tidak=0; Nilai = (jumlah Ada / 10) x 100.
-- - NM = rata-rata Nilai ketiga instrumen.
-- - Kategori PDF: 91-100 Amat Baik, 76-90 Baik, 61-75 Cukup, <=60 Kurang
--   (disimpan sebagai teks; ambang dihitung di aplikasi agar konsisten
--   dengan pola existing — lihat lib/supervision-managerial.ts).
-- =====================================================

ALTER TABLE supervisions
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'academic'
    CHECK (kind IN ('academic', 'managerial'));

ALTER TABLE supervisions
    ADD COLUMN IF NOT EXISTS academic_year TEXT;

ALTER TABLE supervisions
    ADD COLUMN IF NOT EXISTS period TEXT;

CREATE INDEX IF NOT EXISTS idx_supervisions_kind ON supervisions(kind);

CREATE TABLE IF NOT EXISTS supervision_managerial_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervision_id UUID NOT NULL UNIQUE REFERENCES supervisions(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    i1_total INT NOT NULL DEFAULT 0 CHECK (i1_total >= 0 AND i1_total <= 52),
    i1_value NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (i1_value >= 0 AND i1_value <= 100),
    i1_status TEXT NOT NULL DEFAULT 'draft' CHECK (i1_status IN ('draft', 'final')),
    i2_present INT NOT NULL DEFAULT 0 CHECK (i2_present >= 0 AND i2_present <= 10),
    i2_value NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (i2_value >= 0 AND i2_value <= 100),
    i2_status TEXT NOT NULL DEFAULT 'draft' CHECK (i2_status IN ('draft', 'final')),
    i3_total INT NOT NULL DEFAULT 0 CHECK (i3_total >= 0 AND i3_total <= 44),
    i3_value NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (i3_value >= 0 AND i3_value <= 100),
    i3_status TEXT NOT NULL DEFAULT 'draft' CHECK (i3_status IN ('draft', 'final')),
    overall_value NUMERIC(5,2) CHECK (overall_value IS NULL OR (overall_value >= 0 AND overall_value <= 100)),
    grade TEXT NOT NULL DEFAULT 'Kurang' CHECK (grade IN ('Amat Baik', 'Baik', 'Cukup', 'Kurang')),
    findings TEXT,
    supervisor_notes TEXT,
    follow_up_recommendation TEXT,
    improvement_target TEXT,
    follow_up_status TEXT NOT NULL DEFAULT 'none'
        CHECK (follow_up_status IN ('none', 'planned', 'in_progress', 'completed')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_supervision_managerial_assessments_updated_at
    BEFORE UPDATE ON supervision_managerial_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS supervision_managerial_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES supervision_managerial_assessments(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL CHECK (instrument IN ('i1', 'i2', 'i3')),
    item_key TEXT NOT NULL CHECK (item_key ~ '^i[123]_[0-9]{2}$'),
    score INT CHECK (score IS NULL OR (score >= 1 AND score <= 4)),
    present BOOLEAN,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, instrument, item_key)
);

CREATE INDEX IF NOT EXISTS idx_managerial_items_assessment_id
    ON supervision_managerial_items(assessment_id);

ALTER TABLE supervision_managerial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_managerial_items ENABLE ROW LEVEL SECURITY;

-- Baca: satu sekolah via supervisi induk (guru dibatasi miliknya
-- di service layer, sama seperti penilaian instrumen akademik).
CREATE POLICY managerial_assessments_select ON supervision_managerial_assessments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_managerial_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY managerial_items_select ON supervision_managerial_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supervision_managerial_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_managerial_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

-- Tulis: principal/admin sekolah (penilai = supervisor).
CREATE POLICY managerial_assessments_insert ON supervision_managerial_assessments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_managerial_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY managerial_assessments_update ON supervision_managerial_assessments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_managerial_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_managerial_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY managerial_assessments_delete ON supervision_managerial_assessments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_managerial_assessments.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY managerial_items_insert ON supervision_managerial_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervision_managerial_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_managerial_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY managerial_items_update ON supervision_managerial_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervision_managerial_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_managerial_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervision_managerial_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_managerial_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY managerial_items_delete ON supervision_managerial_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervision_managerial_assessments a
            JOIN supervisions s ON s.id = a.supervision_id
            WHERE a.id = supervision_managerial_items.assessment_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );
