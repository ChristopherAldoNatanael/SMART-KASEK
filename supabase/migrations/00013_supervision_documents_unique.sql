-- =====================================================
-- SMART KASEK — Perbaikan dokumen supervisi (optimasi)
-- =====================================================
-- 1 baris per jenis dokumen per supervisi (hemat DB, cegah
-- duplikat bengkak): UNIQUE(supervision_id, doc_type).
-- Tambah policy UPDATE (replace) + UPDATE Storage agar
-- ganti file tidak orphan & tidak lewat server aplikasi.
-- Aditif: aman untuk data existing.
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_supervision_documents_unique
    ON supervision_documents(supervision_id, doc_type);

DROP POLICY IF EXISTS supervision_documents_update ON supervision_documents;
CREATE POLICY supervision_documents_update ON supervision_documents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

DROP POLICY IF EXISTS "supervision_docs_update" ON storage.objects;
CREATE POLICY "supervision_docs_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    )
    WITH CHECK (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
    );
