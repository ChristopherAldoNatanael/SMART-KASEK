-- =====================================================
-- SMART KASEK — Guru melaporkan tindak lanjut miliknya
-- =====================================================
-- Alur: Kepala Sekolah membuat sesi + tindak lanjut → guru
-- mengerjakan dan melaporkan (status + bukti + hasil + catatan)
-- → kepsek memverifikasi → growth terhitung saat selesai.
-- Guru hanya boleh update tindak lanjut pada sesi yang
-- teacher_id-nya milik akunnya (via teachers.profile_id).
-- Buat sesi / hapus / status sesi / tambah tindak lanjut
-- tetap principal/admin.
-- =====================================================

DROP POLICY IF EXISTS coaching_actions_update ON coaching_actions;
CREATE POLICY coaching_actions_update ON coaching_actions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) AND (
            is_admin() OR is_principal() OR EXISTS (
                SELECT 1 FROM coaching_sessions cs
                JOIN teachers t ON t.id = cs.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE cs.id = coaching_actions.coaching_session_id
                AND p.auth_user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) AND (
            is_admin() OR is_principal() OR EXISTS (
                SELECT 1 FROM coaching_sessions cs
                JOIN teachers t ON t.id = cs.teacher_id
                JOIN profiles p ON p.id = t.profile_id
                WHERE cs.id = coaching_actions.coaching_session_id
                AND p.auth_user_id = auth.uid()
            )
        )
    );
