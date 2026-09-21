-- =====================================================
-- SMART KASEK — Dokumen supervisi multi-file per jenis
-- =====================================================
-- Kebutuhan: tiap dari 12 jenis dokumen (CP s.d. Jadwal)
-- dapat memiliki LEBIH DARI SATU berkas (mis. Modul Ajar
-- untuk beberapa kelas/mapel).
--
-- Perubahan: cabut UNIQUE(supervision_id, doc_type) dari
-- ronde optimasi sebelumnya; ganti dengan index komposit
-- non-unique untuk listing per jenis tetap cepat.
-- Aditif & aman untuk data existing (tidak hapus baris).
-- RLS/policy tidak berubah (tetap scope sekolah + pemilik).
-- =====================================================

DROP INDEX IF EXISTS idx_supervision_documents_unique;

CREATE INDEX IF NOT EXISTS idx_supervision_documents_supervision_doctype
    ON supervision_documents(supervision_id, doc_type);
