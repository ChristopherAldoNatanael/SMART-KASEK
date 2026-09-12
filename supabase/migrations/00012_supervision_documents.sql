-- =====================================================
-- SMART KASEK — Dokumen perangkat pada supervisi (ronde-33)
-- =====================================================
-- 12 jenis dokumen pembelajaran (CP s.d. Jadwal Pelajaran)
-- dilampirkan pada supervisi sebagai bukti pemeriksaan.
-- Terpisah dari supervision_items (yang berisi SKOR indikator).
--
-- Optimasi: berkas di Storage privat (bukan byte di Postgres,
-- bukan lewat memori server aplikasi); tabel hanya menyimpan path.
-- Struktur path: {school_id}/{supervision_id}/{timestamp}-{file}
-- =====================================================

CREATE TABLE supervision_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervision_id UUID NOT NULL REFERENCES supervisions(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN (
        'cp', 'atp', 'prota', 'promes', 'modul_ajar',
        'kokurikuler', 'penilaian', 'daftar_hadir',
        'jurnal', 'daftar_nilai', 'kalender', 'jadwal'
    )),
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INT NOT NULL CHECK (file_size > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supervision_documents_supervision_id
    ON supervision_documents(supervision_id);

ALTER TABLE supervision_documents ENABLE ROW LEVEL SECURITY;

-- Baca: sekolah yang sama (via supervisi induk).
CREATE POLICY supervision_documents_select ON supervision_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

-- Tulis/hapus: principal/admin sekolah (pembuatan supervisi
-- memang wewenang principal).
CREATE POLICY supervision_documents_insert ON supervision_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY supervision_documents_delete ON supervision_documents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

-- =====================================================
-- Bucket privat supervision-docs
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('supervision-docs', 'supervision-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "supervision_docs_select" ON storage.objects;
CREATE POLICY "supervision_docs_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
    );

DROP POLICY IF EXISTS "supervision_docs_insert" ON storage.objects;
CREATE POLICY "supervision_docs_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );

DROP POLICY IF EXISTS "supervision_docs_delete" ON storage.objects;
CREATE POLICY "supervision_docs_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );
