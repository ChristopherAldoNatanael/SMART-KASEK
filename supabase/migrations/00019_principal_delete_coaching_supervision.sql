-- =====================================================
-- SMART KASEK — Principal dapat menghapus coaching & supervisi
-- =====================================================
-- Service layer (coaching.service deleteCoachingSession,
-- supervision.service deleteSupervision) memakai requirePrincipal(),
-- dan UI menampilkan tombol Hapus untuk principal. Tapi policy
-- *_delete di 00002 hanya mengizinkan is_admin(), sehingga DELETE
-- oleh principal diblokir RLS secara diam-diam (0 rows, tanpa error)
-- lalu action tetap redirect — data terlihat "ga ke hapus".
--
-- Samakan dengan pola insert/update yang sudah memakai
-- (is_admin() OR is_principal()).
-- =====================================================

DROP POLICY IF EXISTS coaching_sessions_delete ON coaching_sessions;
CREATE POLICY coaching_sessions_delete ON coaching_sessions
    FOR DELETE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

DROP POLICY IF EXISTS coaching_actions_delete ON coaching_actions;
CREATE POLICY coaching_actions_delete ON coaching_actions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

DROP POLICY IF EXISTS supervisions_delete ON supervisions;
CREATE POLICY supervisions_delete ON supervisions
    FOR DELETE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

DROP POLICY IF EXISTS supervision_items_delete ON supervision_items;
CREATE POLICY supervision_items_delete ON supervision_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_items.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );
