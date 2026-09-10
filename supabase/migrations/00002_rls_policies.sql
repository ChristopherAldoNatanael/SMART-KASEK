-- =====================================================
-- SMART KASEK v1.0 — Row Level Security Policies
-- =====================================================
-- Implements multi-tenant school isolation.
-- Users can only access data belonging to their school.
-- =====================================================

-- =====================================================
-- Helper function: Get current user's school_id
-- =====================================================

CREATE OR REPLACE FUNCTION auth_user_school_id()
RETURNS UUID AS $$
DECLARE
    school_id UUID;
BEGIN
    SELECT p.school_id INTO school_id
    FROM profiles p
    WHERE p.auth_user_id = auth.uid();
    RETURN school_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Helper function: Get current user's role
-- =====================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT p.role INTO user_role_val
    FROM profiles p
    WHERE p.auth_user_id = auth.uid();
    RETURN user_role_val;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Helper function: Check if user is admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Helper function: Check if user is principal
-- =====================================================

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth_user_role() = 'principal';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Helper function: Check if user is teacher
-- =====================================================

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth_user_role() = 'teacher';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Enable RLS on all tables
-- =====================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_growth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE good_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE good_practice_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE early_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SCHOOLS POLICIES
-- =====================================================

-- Users can read their own school
CREATE POLICY schools_select ON schools
    FOR SELECT
    USING (id = auth_user_school_id() OR is_admin());

-- Only admins can insert/update/delete schools
CREATE POLICY schools_insert ON schools
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY schools_update ON schools
    FOR UPDATE
    USING (is_admin());

CREATE POLICY schools_delete ON schools
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can read profiles in their school
CREATE POLICY profiles_select ON profiles
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Users can read their own profile (for login)
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Only admins and principals can manage profiles
CREATE POLICY profiles_insert ON profiles
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY profiles_delete ON profiles
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- TEACHERS POLICIES
-- =====================================================

-- Users can read teachers in their school
CREATE POLICY teachers_select ON teachers
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Only admins and principals can manage teachers
CREATE POLICY teachers_insert ON teachers
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY teachers_update ON teachers
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY teachers_delete ON teachers
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- COMPETENCIES POLICIES (Global master data)
-- =====================================================

-- All authenticated users can read competencies
CREATE POLICY competencies_select ON competencies
    FOR SELECT
    USING (true);

-- Only admins can manage competencies
CREATE POLICY competencies_insert ON competencies
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY competencies_update ON competencies
    FOR UPDATE
    USING (is_admin());

CREATE POLICY competencies_delete ON competencies
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- TEACHER_COMPETENCIES POLICIES
-- =====================================================

-- Users can read teacher competencies in their school
CREATE POLICY teacher_competencies_select ON teacher_competencies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_competencies.teacher_id
            AND t.school_id = auth_user_school_id()
        ) OR is_admin()
    );

-- Teachers can insert their own, principals/admins can insert for their school
CREATE POLICY teacher_competencies_insert ON teacher_competencies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_competencies.teacher_id
            AND t.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY teacher_competencies_update ON teacher_competencies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_competencies.teacher_id
            AND t.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY teacher_competencies_delete ON teacher_competencies
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_competencies.teacher_id
            AND t.school_id = auth_user_school_id()
        ) AND is_admin()
    );

-- =====================================================
-- SUPERVISIONS POLICIES
-- =====================================================

CREATE POLICY supervisions_select ON supervisions
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY supervisions_insert ON supervisions
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY supervisions_update ON supervisions
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY supervisions_delete ON supervisions
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- SUPERVISION_ITEMS POLICIES
-- =====================================================

CREATE POLICY supervision_items_select ON supervision_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_items.supervision_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY supervision_items_insert ON supervision_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_items.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY supervision_items_update ON supervision_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_items.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY supervision_items_delete ON supervision_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM supervisions s
            WHERE s.id = supervision_items.supervision_id
            AND s.school_id = auth_user_school_id()
        ) AND is_admin()
    );

-- =====================================================
-- COACHING_SESSIONS POLICIES
-- =====================================================

CREATE POLICY coaching_sessions_select ON coaching_sessions
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY coaching_sessions_insert ON coaching_sessions
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY coaching_sessions_update ON coaching_sessions
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY coaching_sessions_delete ON coaching_sessions
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- COACHING_ACTIONS POLICIES
-- =====================================================

CREATE POLICY coaching_actions_select ON coaching_actions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY coaching_actions_insert ON coaching_actions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY coaching_actions_update ON coaching_actions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY coaching_actions_delete ON coaching_actions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coaching_sessions cs
            WHERE cs.id = coaching_actions.coaching_session_id
            AND cs.school_id = auth_user_school_id()
        ) AND is_admin()
    );

-- =====================================================
-- TEACHER_GROWTH_SNAPSHOTS POLICIES
-- =====================================================

CREATE POLICY teacher_growth_snapshots_select ON teacher_growth_snapshots
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_growth_snapshots.teacher_id
            AND t.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY teacher_growth_snapshots_insert ON teacher_growth_snapshots
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_growth_snapshots.teacher_id
            AND t.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY teacher_growth_snapshots_update ON teacher_growth_snapshots
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_growth_snapshots.teacher_id
            AND t.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY teacher_growth_snapshots_delete ON teacher_growth_snapshots
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teacher_growth_snapshots.teacher_id
            AND t.school_id = auth_user_school_id()
        ) AND is_admin()
    );

-- =====================================================
-- LESSON_PLANS POLICIES
-- =====================================================

CREATE POLICY lesson_plans_select ON lesson_plans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = lesson_plans.teacher_id
            AND t.school_id = auth_user_school_id()
        ) OR is_admin()
    );

-- Teachers can manage their own lesson plans
CREATE POLICY lesson_plans_insert ON lesson_plans
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = lesson_plans.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );

CREATE POLICY lesson_plans_update ON lesson_plans
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = lesson_plans.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );

CREATE POLICY lesson_plans_delete ON lesson_plans
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = lesson_plans.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin()
    );

-- =====================================================
-- TEACHING_JOURNALS POLICIES
-- =====================================================

CREATE POLICY teaching_journals_select ON teaching_journals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teaching_journals.teacher_id
            AND t.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY teaching_journals_insert ON teaching_journals
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teaching_journals.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );

CREATE POLICY teaching_journals_update ON teaching_journals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teaching_journals.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );

CREATE POLICY teaching_journals_delete ON teaching_journals
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = teaching_journals.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin()
    );

-- =====================================================
-- ASSESSMENTS POLICIES
-- =====================================================

CREATE POLICY assessments_select ON assessments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = assessments.teacher_id
            AND t.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY assessments_insert ON assessments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = assessments.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );

CREATE POLICY assessments_update ON assessments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = assessments.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin() OR is_principal()
    );

CREATE POLICY assessments_delete ON assessments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = assessments.teacher_id
            AND t.school_id = auth_user_school_id()
            AND t.profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        ) OR is_admin()
    );

-- =====================================================
-- GOOD_PRACTICES POLICIES
-- =====================================================

CREATE POLICY good_practices_select ON good_practices
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY good_practices_insert ON good_practices
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id());

CREATE POLICY good_practices_update ON good_practices
    FOR UPDATE
    USING (
        school_id = auth_user_school_id() AND
        (is_admin() OR is_principal())
    );

CREATE POLICY good_practices_delete ON good_practices
    FOR DELETE
    USING (
        school_id = auth_user_school_id() AND is_admin()
    );

-- =====================================================
-- GOOD_PRACTICE_COMMENTS POLICIES
-- =====================================================

CREATE POLICY good_practice_comments_select ON good_practice_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM good_practices gp
            WHERE gp.id = good_practice_comments.good_practice_id
            AND gp.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY good_practice_comments_insert ON good_practice_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM good_practices gp
            WHERE gp.id = good_practice_comments.good_practice_id
            AND gp.school_id = auth_user_school_id()
        )
    );

CREATE POLICY good_practice_comments_delete ON good_practice_comments
    FOR DELETE
    USING (
        user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR is_admin()
    );

-- =====================================================
-- STUDENTS POLICIES
-- =====================================================

CREATE POLICY students_select ON students
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY students_insert ON students
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY students_update ON students
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY students_delete ON students
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- STUDENT_INDICATORS POLICIES
-- =====================================================

CREATE POLICY student_indicators_select ON student_indicators
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = student_indicators.student_id
            AND s.school_id = auth_user_school_id()
        ) OR is_admin()
    );

CREATE POLICY student_indicators_insert ON student_indicators
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = student_indicators.student_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY student_indicators_update ON student_indicators
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = student_indicators.student_id
            AND s.school_id = auth_user_school_id()
        ) AND (is_admin() OR is_principal())
    );

CREATE POLICY student_indicators_delete ON student_indicators
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = student_indicators.student_id
            AND s.school_id = auth_user_school_id()
        ) AND is_admin()
    );

-- =====================================================
-- PROGRAMS POLICIES
-- =====================================================

CREATE POLICY programs_select ON programs
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY programs_insert ON programs
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY programs_update ON programs
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY programs_delete ON programs
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- LETTERS POLICIES
-- =====================================================

CREATE POLICY letters_select ON letters
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY letters_insert ON letters
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY letters_update ON letters
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY letters_delete ON letters
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- DECISIONS POLICIES
-- =====================================================

CREATE POLICY decisions_select ON decisions
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY decisions_insert ON decisions
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY decisions_update ON decisions
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY decisions_delete ON decisions
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- MEETING_MINUTES POLICIES
-- =====================================================

CREATE POLICY meeting_minutes_select ON meeting_minutes
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY meeting_minutes_insert ON meeting_minutes
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY meeting_minutes_update ON meeting_minutes
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY meeting_minutes_delete ON meeting_minutes
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- AI_INTERACTIONS POLICIES
-- =====================================================

CREATE POLICY ai_interactions_select ON ai_interactions
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY ai_interactions_insert ON ai_interactions
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id());

-- No update/delete for audit trail integrity

-- =====================================================
-- AI_INSIGHTS POLICIES
-- =====================================================

CREATE POLICY ai_insights_select ON ai_insights
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY ai_insights_insert ON ai_insights
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY ai_insights_update ON ai_insights
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY ai_insights_delete ON ai_insights
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- EARLY_WARNINGS POLICIES
-- =====================================================

CREATE POLICY early_warnings_select ON early_warnings
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

CREATE POLICY early_warnings_insert ON early_warnings
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY early_warnings_update ON early_warnings
    FOR UPDATE
    USING (school_id = auth_user_school_id() AND (is_admin() OR is_principal()));

CREATE POLICY early_warnings_delete ON early_warnings
    FOR DELETE
    USING (school_id = auth_user_school_id() AND is_admin());

-- =====================================================
-- AUDIT_LOGS POLICIES (Read-only for school)
-- =====================================================

CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT
    USING (school_id = auth_user_school_id() OR is_admin());

-- Only system can insert audit logs (via trigger)
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT
    WITH CHECK (school_id = auth_user_school_id());

-- No update/delete for audit trail integrity
