-- =====================================================
-- SMART KASEK v1.0 — Initial Database Schema
-- =====================================================
-- This migration creates all 25 tables with proper constraints,
-- foreign keys, indexes, and timestamps.
-- =====================================================

-- NOTE: Using gen_random_uuid() (built into PostgreSQL 15+) instead of gen_random_uuid()
-- to avoid requiring the uuid-ossp extension.

-- =====================================================
-- Custom ENUM types
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'principal', 'teacher');
CREATE TYPE supervision_status AS ENUM ('draft', 'completed', 'follow_up', 'closed');
CREATE TYPE competency_source AS ENUM ('supervision', 'self_assessment', 'coaching', 'assessment', 'manual', 'ai');
CREATE TYPE coaching_action_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE good_practice_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE ai_feature_type AS ENUM ('assistant', 'coach', 'school_insight', 'early_warning');
CREATE TYPE ai_insight_type AS ENUM ('teacher_growth', 'school_performance', 'supervision', 'coaching', 'risk');
CREATE TYPE warning_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE warning_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
CREATE TYPE student_gender AS ENUM ('male', 'female');
CREATE TYPE student_status AS ENUM ('active', 'graduated', 'transferred', 'dropped');
CREATE TYPE program_status AS ENUM ('planned', 'ongoing', 'completed', 'cancelled');
CREATE TYPE letter_type AS ENUM ('incoming', 'outgoing');

-- =====================================================
-- 1. SCHOOLS (Multi-tenant root)
-- =====================================================

CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    npsn TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schools_npsn ON schools(npsn);

-- =====================================================
-- 2. PROFILES (Linked to Supabase Auth)
-- =====================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'teacher',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_school_id ON profiles(school_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =====================================================
-- 3. TEACHERS
-- =====================================================

CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    employee_number TEXT,
    nip TEXT,
    subject TEXT,
    department TEXT,
    education_level TEXT,
    employment_status TEXT NOT NULL DEFAULT 'active',
    joined_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teachers_profile_id ON teachers(profile_id);
CREATE INDEX idx_teachers_school_id ON teachers(school_id);
CREATE INDEX idx_teachers_employee_number ON teachers(employee_number);

-- =====================================================
-- 4. COMPETENCIES (Master competency list)
-- =====================================================

CREATE TABLE competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    weight NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (weight >= 0 AND weight <= 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_competencies_category ON competencies(category);
CREATE INDEX idx_competencies_is_active ON competencies(is_active);

-- =====================================================
-- 5. TEACHER_COMPETENCIES (Teacher-competency scores)
-- =====================================================

CREATE TABLE teacher_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    source competency_source NOT NULL DEFAULT 'manual',
    assessed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_teacher_competencies_teacher_id ON teacher_competencies(teacher_id);
CREATE INDEX idx_teacher_competencies_competency_id ON teacher_competencies(competency_id);
CREATE UNIQUE INDEX idx_teacher_competencies_unique
    ON teacher_competencies(teacher_id, competency_id, assessed_at);

-- =====================================================
-- 6. SUPERVISIONS
-- =====================================================

CREATE TABLE supervisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    supervision_date DATE NOT NULL,
    type TEXT,
    overall_score NUMERIC(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
    summary TEXT,
    strengths TEXT,
    improvements TEXT,
    status supervision_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supervisions_school_id ON supervisions(school_id);
CREATE INDEX idx_supervisions_teacher_id ON supervisions(teacher_id);
CREATE INDEX idx_supervisions_supervisor_id ON supervisions(supervisor_id);
CREATE INDEX idx_supervisions_status ON supervisions(status);
CREATE INDEX idx_supervisions_date ON supervisions(supervision_date);

-- =====================================================
-- 7. SUPERVISION_ITEMS
-- =====================================================

CREATE TABLE supervision_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervision_id UUID NOT NULL REFERENCES supervisions(id) ON DELETE CASCADE,
    indicator TEXT NOT NULL,
    category TEXT,
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    observation TEXT,
    recommendation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supervision_items_supervision_id ON supervision_items(supervision_id);
CREATE INDEX idx_supervision_items_category ON supervision_items(category);

-- =====================================================
-- 8. COACHING_SESSIONS
-- =====================================================

CREATE TABLE coaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    supervision_id UUID REFERENCES supervisions(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    focus_area TEXT,
    initial_condition TEXT,
    discussion TEXT,
    agreement TEXT,
    summary TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_sessions_school_id ON coaching_sessions(school_id);
CREATE INDEX idx_coaching_sessions_teacher_id ON coaching_sessions(teacher_id);
CREATE INDEX idx_coaching_sessions_coach_id ON coaching_sessions(coach_id);
CREATE INDEX idx_coaching_sessions_supervision_id ON coaching_sessions(supervision_id);

-- =====================================================
-- 9. COACHING_ACTIONS
-- =====================================================

CREATE TABLE coaching_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coaching_session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_date DATE,
    completed_date DATE,
    status coaching_action_status NOT NULL DEFAULT 'pending',
    evidence TEXT,
    result TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_actions_session_id ON coaching_actions(coaching_session_id);
CREATE INDEX idx_coaching_actions_status ON coaching_actions(status);
CREATE INDEX idx_coaching_actions_target_date ON coaching_actions(target_date);

-- =====================================================
-- 10. TEACHER_GROWTH_SNAPSHOTS
-- =====================================================

CREATE TABLE teacher_growth_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    overall_score NUMERIC(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
    pedagogic_score NUMERIC(5,2) CHECK (pedagogic_score >= 0 AND pedagogic_score <= 100),
    professional_score NUMERIC(5,2) CHECK (professional_score >= 0 AND professional_score <= 100),
    social_score NUMERIC(5,2) CHECK (social_score >= 0 AND social_score <= 100),
    personality_score NUMERIC(5,2) CHECK (personality_score >= 0 AND personality_score <= 100),
    digital_score NUMERIC(5,2) CHECK (digital_score >= 0 AND digital_score <= 100),
    assessment_score NUMERIC(5,2) CHECK (assessment_score >= 0 AND assessment_score <= 100),
    classroom_score NUMERIC(5,2) CHECK (classroom_score >= 0 AND classroom_score <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teacher_growth_teacher_id ON teacher_growth_snapshots(teacher_id);
CREATE INDEX idx_teacher_growth_period ON teacher_growth_snapshots(period);
CREATE UNIQUE INDEX idx_teacher_growth_unique
    ON teacher_growth_snapshots(teacher_id, period);

-- =====================================================
-- 11. LESSON_PLANS
-- =====================================================

CREATE TABLE lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    class_name TEXT,
    semester TEXT,
    description TEXT,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_plans_teacher_id ON lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_status ON lesson_plans(status);

-- =====================================================
-- 12. TEACHING_JOURNALS
-- =====================================================

CREATE TABLE teaching_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    subject TEXT,
    class_name TEXT,
    topic TEXT,
    activity TEXT,
    reflection TEXT,
    obstacles TEXT,
    next_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teaching_journals_teacher_id ON teaching_journals(teacher_id);
CREATE INDEX idx_teaching_journals_date ON teaching_journals(date);

-- =====================================================
-- 13. ASSESSMENTS
-- =====================================================

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject TEXT,
    class_name TEXT,
    assessment_type TEXT,
    assessment_date DATE,
    average_score NUMERIC(5,2) CHECK (average_score >= 0 AND average_score <= 100),
    completion_rate NUMERIC(5,2) CHECK (completion_rate >= 0 AND completion_rate <= 100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_teacher_id ON assessments(teacher_id);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);

-- =====================================================
-- 14. GOOD_PRACTICES
-- =====================================================

CREATE TABLE good_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT,
    problem TEXT,
    strategy TEXT,
    implementation TEXT,
    result TEXT,
    description TEXT,
    cover_url TEXT,
    status good_practice_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_good_practices_school_id ON good_practices(school_id);
CREATE INDEX idx_good_practices_teacher_id ON good_practices(teacher_id);
CREATE INDEX idx_good_practices_status ON good_practices(status);
CREATE INDEX idx_good_practices_category ON good_practices(category);

-- =====================================================
-- 15. GOOD_PRACTICE_COMMENTS
-- =====================================================

CREATE TABLE good_practice_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    good_practice_id UUID NOT NULL REFERENCES good_practices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_good_practice_comments_practice_id ON good_practice_comments(good_practice_id);
CREATE INDEX idx_good_practice_comments_user_id ON good_practice_comments(user_id);

-- =====================================================
-- 16. STUDENTS
-- =====================================================

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_number TEXT,
    full_name TEXT NOT NULL,
    class_name TEXT,
    gender student_gender,
    status student_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_name ON students(class_name);
CREATE INDEX idx_students_status ON students(status);

-- =====================================================
-- 17. STUDENT_INDICATORS
-- =====================================================

CREATE TABLE student_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    indicator TEXT NOT NULL,
    value NUMERIC(10,2),
    period TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_indicators_student_id ON student_indicators(student_id);
CREATE INDEX idx_student_indicators_period ON student_indicators(period);

-- =====================================================
-- 18. PROGRAMS
-- =====================================================

CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status program_status NOT NULL DEFAULT 'planned',
    budget NUMERIC(15,2),
    responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programs_school_id ON programs(school_id);
CREATE INDEX idx_programs_status ON programs(status);

-- =====================================================
-- 19. LETTERS
-- =====================================================

CREATE TABLE letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    number TEXT,
    type letter_type NOT NULL DEFAULT 'outgoing',
    subject TEXT,
    date DATE,
    file_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_letters_school_id ON letters(school_id);
CREATE INDEX idx_letters_type ON letters(type);
CREATE INDEX idx_letters_date ON letters(date);

-- =====================================================
-- 20. DECISIONS
-- =====================================================

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    number TEXT,
    title TEXT NOT NULL,
    date DATE,
    description TEXT,
    file_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decisions_school_id ON decisions(school_id);
CREATE INDEX idx_decisions_date ON decisions(date);

-- =====================================================
-- 21. MEETING_MINUTES
-- =====================================================

CREATE TABLE meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    title TEXT NOT NULL,
    participants TEXT,
    summary TEXT,
    decisions TEXT,
    action_items TEXT,
    file_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_minutes_school_id ON meeting_minutes(school_id);
CREATE INDEX idx_meeting_minutes_date ON meeting_minutes(meeting_date);

-- =====================================================
-- 22. AI_INTERACTIONS
-- =====================================================

CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    feature ai_feature_type NOT NULL,
    question TEXT,
    context JSONB,
    response JSONB,
    model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_interactions_school_id ON ai_interactions(school_id);
CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_feature ON ai_interactions(feature);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);

-- =====================================================
-- 23. AI_INSIGHTS
-- =====================================================

CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    type ai_insight_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    source_data JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_ai_insights_school_id ON ai_insights(school_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(type);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_expires_at ON ai_insights(expires_at);

-- =====================================================
-- 24. EARLY_WARNINGS
-- =====================================================

CREATE TABLE early_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity warning_severity NOT NULL DEFAULT 'low',
    title TEXT NOT NULL,
    description TEXT,
    evidence JSONB,
    recommendation TEXT,
    status warning_status NOT NULL DEFAULT 'active',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_early_warnings_school_id ON early_warnings(school_id);
CREATE INDEX idx_early_warnings_teacher_id ON early_warnings(teacher_id);
CREATE INDEX idx_early_warnings_severity ON early_warnings(severity);
CREATE INDEX idx_early_warnings_status ON early_warnings(status);

-- =====================================================
-- 25. AUDIT_LOGS
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- Trigger function for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supervisions_updated_at BEFORE UPDATE ON supervisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON coaching_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_actions_updated_at BEFORE UPDATE ON coaching_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_good_practices_updated_at BEFORE UPDATE ON good_practices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
