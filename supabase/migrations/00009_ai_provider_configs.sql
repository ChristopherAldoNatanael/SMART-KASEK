-- =====================================================
-- SMART KASEK — Kelola AI provider per sekolah (ronde-24)
-- =====================================================
-- Kepala Sekolah menyimpan 1+ konfigurasi provider (utama +
-- cadangan). Aplikasi mencoba berurutan sampai berhasil, sehingga
-- kuota habis/error tidak mematikan fitur AI saat demo.
--
-- Keamanan:
-- - Kunci HANYA dibaca server-side (service/actions). UI hanya
--   menerima 4 karakter terakhir (mask).
-- - RLS: principal/admin sekolah sendiri untuk semua operasi.
-- - Tidak ada SELECT publik; anon tanpa principal tidak bisa baca.
-- =====================================================

CREATE TABLE ai_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'custom'
        CHECK (provider IN ('openai', 'custom', 'gemini')),
    base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (school_id, label)
);

CREATE INDEX idx_ai_provider_configs_school_id
    ON ai_provider_configs(school_id);

ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_provider_configs_select ON ai_provider_configs
    FOR SELECT
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal())
    );

CREATE POLICY ai_provider_configs_insert ON ai_provider_configs
    FOR INSERT
    WITH CHECK (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal())
    );

CREATE POLICY ai_provider_configs_update ON ai_provider_configs
    FOR UPDATE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal())
    );

CREATE POLICY ai_provider_configs_delete ON ai_provider_configs
    FOR DELETE
    USING (
        school_id = auth_user_school_id()
        AND (is_admin() OR is_principal())
    );
