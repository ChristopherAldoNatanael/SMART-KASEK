-- =====================================================
-- SMART KASEK v1.0 — Demo Seed Data
-- =====================================================
-- This script creates realistic demo data for testing.
-- Run this after applying migrations 00001 and 00002.
-- =====================================================

-- NOTE: Replace 'YOUR_AUTH_USER_ID' with an actual auth user ID
-- from your Supabase project (created via Dashboard or signup).

-- =====================================================
-- 1. Create a demo school
-- =====================================================

INSERT INTO schools (id, name, npsn, address, phone, email)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SMP Negeri 1 Contoh',
  '12345678',
  'Jl. Pendidikan No. 1, Jakarta',
  '021-1234567',
  'smpn1contoh@sch.id'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Create demo competencies
-- =====================================================

INSERT INTO competencies (id, name, category, description, weight, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Pedagogik', 'Inti', 'Kompetensi mengelola pembelajaran', 1.00, true),
  ('b0000000-0000-0000-0000-000000000002', 'Profesional', 'Inti', 'Kompetensi pengembangan profesional', 1.00, true),
  ('b0000000-0000-0000-0000-000000000003', 'Sosial', 'Inti', 'NONAKTIF sejak 00021 — tidak dipakai', 0.80, false),
  ('b0000000-0000-0000-0000-000000000004', 'Kepribadian', 'Inti', 'NONAKTIF sejak 00021 — tidak dipakai', 0.80, false),
  ('b0000000-0000-0000-0000-000000000005', 'Digital', 'Penunjang', 'NONAKTIF sejak 00021 — tidak dipakai', 0.90, false),
  ('b0000000-0000-0000-0000-000000000006', 'Asesmen', 'Penunjang', 'Kompetensi penilaian pembelajaran', 1.00, true),
  ('b0000000-0000-0000-0000-000000000007', 'Manajemen Kelas', 'Penunjang', 'Kompetensi mengelola kelas', 0.90, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. Create demo teachers
-- =====================================================

-- NOTE: Replace auth_user_id values with actual auth IDs
-- Format: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

INSERT INTO profiles (id, auth_user_id, school_id, full_name, email, role, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'AUTH_USER_ID_1', 'a0000000-0000-0000-0000-000000000001', 'Ahmad Fauzi', 'ahmad@sch.id', 'teacher', true),
  ('c0000000-0000-0000-0000-000000000002', 'AUTH_USER_ID_2', 'a0000000-0000-0000-0000-000000000001', 'Siti Rahayu', 'siti@sch.id', 'teacher', true),
  ('c0000000-0000-0000-0000-000000000003', 'AUTH_USER_ID_3', 'a0000000-0000-0000-0000-000000000001', 'Budi Santoso', 'budi@sch.id', 'teacher', true),
  ('c0000000-0000-0000-0000-000000000004', 'AUTH_USER_ID_4', 'a0000000-0000-0000-0000-000000000001', 'Dewi Lestari', 'dewi@sch.id', 'teacher', true),
  ('c0000000-0000-0000-0000-000000000005', 'AUTH_USER_ID_5', 'a0000000-0000-0000-0000-000000000001', 'Eko Prasetyo', 'eko@sch.id', 'teacher', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (id, profile_id, school_id, employee_number, nip, subject, department, education_level, employment_status, joined_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'NUPTK001', '198501012010011001', 'Matematika', 'IPA', 'S1', 'active', '2010-01-01'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'NUPTK002', '198705152010012002', 'Bahasa Indonesia', 'Bahasa', 'S1', 'active', '2010-01-01'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'NUPTK003', '198812202011011003', 'IPA', 'IPA', 'S1', 'active', '2011-01-01'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'NUPTK004', '199001102012012004', 'Bahasa Inggris', 'Bahasa', 'S2', 'active', '2012-01-01'),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'NUPTK005', '199105202013011005', 'IPS', 'IPS', 'S1', 'active', '2013-01-01')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. Create demo teacher competencies
-- =====================================================

INSERT INTO teacher_competencies (teacher_id, competency_id, score, source, assessed_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 85, 'supervision', '2024-01-15'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 90, 'supervision', '2024-01-15'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 65, 'supervision', '2024-01-15'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 78, 'supervision', '2024-01-20'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 82, 'supervision', '2024-01-20'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 72, 'supervision', '2024-02-01'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006', 60, 'supervision', '2024-02-01'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 88, 'supervision', '2024-02-10'),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 75, 'supervision', '2024-02-15')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. Create demo growth snapshots
-- =====================================================

INSERT INTO teacher_growth_snapshots (teacher_id, period, overall_score, pedagogic_score, professional_score, assessment_score, classroom_score) VALUES
  ('d0000000-0000-0000-0000-000000000001', '2024-Ganjil', 78, 85, 80, 65, 72),
  ('d0000000-0000-0000-0000-000000000001', '2024-Genap', 82, 88, 85, 70, 75),
  ('d0000000-0000-0000-0000-000000000002', '2024-Ganjil', 72, 78, 75, 60, 68),
  ('d0000000-0000-0000-0000-000000000002', '2024-Genap', 76, 82, 78, 65, 70),
  ('d0000000-0000-0000-0000-000000000003', '2024-Ganjil', 68, 72, 70, 55, 62),
  ('d0000000-0000-0000-0000-000000000003', '2024-Genap', 74, 78, 75, 62, 68)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. Create demo supervisions
-- =====================================================

INSERT INTO supervisions (id, school_id, teacher_id, supervisor_id, supervision_date, type, overall_score, summary, strengths, improvements, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2024-01-15', 'Rutin', 78, 'Pembelajaran berjalan dengan baik', 'Penguasaan materi baik, interaksi dengan siswa aktif', 'Perlu meningkatkan asesmen formatif', 'completed'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', '2024-01-20', 'Rutin', 72, 'Pembelajaran cukup baik', 'Suara jelas, media pembelajaran menarik', 'Perlu meningkatkan manajemen kelas', 'completed'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', '2024-02-01', 'Rutin', 68, 'Pembelajaran perlu perbaikan', 'Menguasai materi', 'Perlu meningkatkan interaksi dan asesmen', 'follow_up')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. Create demo coaching sessions
-- =====================================================

INSERT INTO coaching_sessions (id, school_id, teacher_id, coach_id, supervision_id, session_date, focus_area, initial_condition, discussion, agreement, summary, status) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', '2024-02-15', 'Asesmen Formatif', 'Skor asesmen rendah (55)', 'Diskusi tentang teknik asesmen formatif yang efektif', 'Membuat rubrik asesmen formatif untuk 2 pertemuan berikutnya', 'Coaching fokus pada peningkatan kemampuan asesmen formatif', 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO coaching_actions (coaching_session_id, action, target_date, status) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Membuat rubrik asesmen formatif', '2024-03-01', 'completed'),
  ('f0000000-0000-0000-0000-000000000001', 'Menerapkan asesmen formatif di 2 pertemuan', '2024-03-15', 'in_progress')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Demo data creation complete
-- =====================================================
