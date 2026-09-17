-- =====================================================
-- SMART KASEK — Perbaikan policy supervision_managerial_items
-- =====================================================
-- Migrasi 00022 membuat policy UPDATE/DELETE yang memeriksa tabel
-- yang sama dengan yang dijaga (self-join):
--
--     ... FROM supervision_managerial_items self ...
--
-- Akibatnya setiap simpan/ubah item gagal dengan:
-- "infinite recursion detected in policy for relation
--  supervision_managerial_items".
--
-- Perbaikan: hapus kedua policy lalu buat ulang TANPA self-join,
-- mengikuti pola 00015 yang terbukti jalan — cukup cocokkan baris
-- lewat assessment induk + supervisi + sekolah user.
-- =====================================================

DROP POLICY IF EXISTS managerial_items_update ON supervision_managerial_items;
DROP POLICY IF EXISTS managerial_items_delete ON supervision_managerial_items;

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
