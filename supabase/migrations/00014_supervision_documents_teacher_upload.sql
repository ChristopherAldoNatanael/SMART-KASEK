-- =====================================================
-- SMART KASEK — Dokumen supervisi oleh guru pemilik
-- =====================================================
-- Alur: Guru mengunggah 12 perangkat miliknya ke supervisi
-- miliknya → Kepala Sekolah menilai → Coaching.
-- Guru hanya boleh tulis pada supervisi yang teacher_id-nya
-- milik akunnya (via teachers.profile_id → profiles.auth_user_id).
-- Principal/admin tetap penuh. Baca tetap satu sekolah.
-- Bucket tetap privat; signed URL durasi pendek dari server.
-- =====================================================

-- ---------- Tabel: izinkan guru pemilik tulis ----------

DROP POLICY IF EXISTS supervision_documents_insert ON supervision_documents;
CREATE POLICY supervision_documents_insert ON supervision_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (
            is_admin() OR is_principal() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id = supervision_documents.supervision_id
                AND p.auth_user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS supervision_documents_update ON supervision_documents;
CREATE POLICY supervision_documents_update ON supervision_documents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (
            is_admin() OR is_principal() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id = supervision_documents.supervision_id
                AND p.auth_user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (
            is_admin() OR is_principal() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id = supervision_documents.supervision_id
                AND p.auth_user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS supervision_documents_delete ON supervision_documents;
CREATE POLICY supervision_documents_delete ON supervision_documents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_documents.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (
            is_admin() OR is_principal() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id = supervision_documents.supervision_id
                AND p.auth_user_id = auth.uid()
            )
        )
    );

-- ---------- Storage: izinkan guru pemilik tulis ----------
-- Path: {school_id}/{supervision_id}/{file}
-- Kepemilikan dicek via supervisions → teachers → profiles.

DROP POLICY IF EXISTS "supervision_docs_insert" ON storage.objects;
CREATE POLICY "supervision_docs_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (
            is_principal() OR is_admin() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id::text = split_part(name, '/', 2)
                AND s.school_id = auth_user_school_id()
                AND p.auth_user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "supervision_docs_update" ON storage.objects;
CREATE POLICY "supervision_docs_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (
            is_principal() OR is_admin() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id::text = split_part(name, '/', 2)
                AND s.school_id = auth_user_school_id()
                AND p.auth_user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
    );

DROP POLICY IF EXISTS "supervision_docs_delete" ON storage.objects;
CREATE POLICY "supervision_docs_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'supervision-docs'
        AND split_part(name, '/', 1) = auth_user_school_id()::text
        AND (
            is_principal() OR is_admin() OR EXISTS (
                SELECT 1 FROM supervisions s
                JOIN teachers t ON t.id = s.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE s.id::text = split_part(name, '/', 2)
                AND s.school_id = auth_user_school_id()
                AND p.auth_user_id = auth.uid()
            )
        )
    );
