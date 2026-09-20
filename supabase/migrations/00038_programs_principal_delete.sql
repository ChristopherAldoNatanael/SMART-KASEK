-- =====================================================
-- SMART KASEK — Kepala Sekolah boleh menghapus program
-- =====================================================
-- Sebelumnya programs_delete hanya untuk admin, sehingga salah ketik
-- tidak bisa dibersihkan oleh Kepala Sekolah. Kebijakan baru tetap
-- mengunci per sekolah: principal hanya menghapus milik sekolahnya.
-- Teacher/guru tetap tidak bisa menghapus (ditolak service + RLS).
-- =====================================================

DROP POLICY IF EXISTS programs_delete ON programs;
CREATE POLICY programs_delete ON programs
  FOR DELETE
  USING (
    school_id = auth_user_school_id()
    AND (is_admin() OR is_principal())
  );
