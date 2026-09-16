-- =====================================================
-- SMART KASEK — Repair coaching-evidence bucket MIME types
-- =====================================================
-- Gejala: upload bukti .docx gagal dengan
-- "mime type application/vnd.openxmlformats-officedocument.
--  wordprocessingml.document is not supported" (role guru & kepsek,
-- keduanya lewat service yang sama).
-- Penyebab: bucket coaching-evidence di production dibuat dengan
-- allowed_mime_types yang belum mencakup .docx (atau varian MIME
-- dari browser/OS tertentu). Migrasi 00017 sudah mendefinisikan
-- daftar lengkap, tapi bucket yang sudah ada tidak selalu ter-update.
-- Migrasi ini idempotent: sinkronkan ulang daftar MIME + limit.
-- =====================================================

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
