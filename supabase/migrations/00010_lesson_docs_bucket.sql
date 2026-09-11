-- =====================================================
-- SMART KASEK — Bucket dokumen modul ajar (ronde-25)
-- =====================================================
-- File TIDAK lewat server aplikasi (hemat memori/bandwidth):
-- browser mengunggah langsung ke Storage, database hanya
-- menyimpan path. Bucket PRIVATE; baca memakai signed URL
-- berdurasi pendek yang dibuat server-side per baris.
--
-- Struktur path: {school_id}/{teacher_id}/{timestamp}-{file}
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-docs', 'lesson-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Baca: anggota sekolah yang sama.
DROP POLICY IF EXISTS "lesson_docs_select" ON storage.objects;
CREATE POLICY "lesson_docs_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'lesson-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
    );

-- Tulis: principal sekolah ATAU guru pemilik folder.
DROP POLICY IF EXISTS "lesson_docs_insert" ON storage.objects;
CREATE POLICY "lesson_docs_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'lesson-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (
            is_principal() OR is_admin()
            OR split_part(name, '/', 2) IN (
                SELECT t.id::text FROM teachers t
                JOIN profiles p ON p.id = t.profile_id
                WHERE p.auth_user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "lesson_docs_update" ON storage.objects;
CREATE POLICY "lesson_docs_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'lesson-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );

DROP POLICY IF EXISTS "lesson_docs_delete" ON storage.objects;
CREATE POLICY "lesson_docs_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'lesson-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (is_principal() OR is_admin())
    );
