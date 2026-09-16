-- =====================================================
-- SMART KASEK — Coaching Evidence Storage
-- =====================================================
-- Support bukti tindak lanjut: teks, link Google Drive, atau
-- file upload (PDF, DOCX, gambar, dll).
-- =====================================================

-- Insert bucket untuk bukti coaching (private, signed URL)
-- Gunakan upsert agar bucket yang sudah ada juga ter-update MIME types-nya
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coaching-evidence',
  'coaching-evidence',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit,
  public = EXCLUDED.public;

-- Policy: Upload hanya untuk user yang bisa update coaching_actions
CREATE POLICY "coaching_evidence_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'coaching-evidence'
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.auth_user_id = auth.uid()
            AND p.role IN ('principal', 'admin', 'teacher')
        )
    );

-- Policy: Download/Read hanya untuk user yang bisa lihat coaching
CREATE POLICY "coaching_evidence_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'coaching-evidence'
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.auth_user_id = auth.uid()
            AND p.role IN ('principal', 'admin', 'teacher')
        )
    );

-- Policy: Delete hanya untuk principal/admin atau pemilik file
CREATE POLICY "coaching_evidence_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'coaching-evidence'
        AND (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.auth_user_id = auth.uid()
                AND p.role IN ('principal', 'admin')
            )
            OR (storage.foldername(name))[1] = auth.uid()::text
        )
    );

-- Policy: Update (replace) hanya untuk principal/admin atau pemilik file
CREATE POLICY "coaching_evidence_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'coaching-evidence'
        AND (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.auth_user_id = auth.uid()
                AND p.role IN ('principal', 'admin')
            )
            OR (storage.foldername(name))[1] = auth.uid()::text
        )
    );
