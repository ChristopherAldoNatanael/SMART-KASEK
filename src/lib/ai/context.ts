"use server";

import { createClient } from "@/lib/supabase/server";

export interface TeacherContext {
  profile: {
    fullName: string;
    subject: string | null;
    department: string | null;
    educationLevel: string | null;
    joinedAt: string | null;
  };
  competencies: {
    name: string;
    category: string;
    score: number;
    assessedAt: string;
  }[];
  recentSupervisions: {
    date: string;
    overallScore: number | null;
    strengths: string | null;
    improvements: string | null;
    status: string;
    items: {
      indicator: string;
      score: number | null;
      observation: string | null;
    }[];
  }[];
  recentCoaching: {
    date: string;
    focusArea: string | null;
    summary: string | null;
    actions: {
      action: string;
      status: string;
      targetDate: string | null;
      completedDate: string | null;
    }[];
  }[];
  growthHistory: {
    period: string;
    overallScore: number | null;
    pedagogicScore: number | null;
    professionalScore: number | null;
    assessmentScore: number | null;
    classroomScore: number | null;
  }[];
}

export interface SchoolInsightContext {
  teacherCount: number;
  averageGrowth: number | null;
  supervisionStats: {
    total: number;
    completed: number;
    averageScore: number | null;
  };
  competencyAverages: {
    name: string;
    category: string;
    averageScore: number;
  }[];
  recentWarnings: {
    teacherName: string;
    type: string;
    severity: string;
    detectedAt: string;
  }[];
}

/**
 * Build context for AI Coach Guru feature.
 * Gathers minimal, relevant data about one teacher (AGENTS.md §11).
 * The teacher MUST belong to schoolId — otherwise null is returned,
 * so AI can never read cross-school data (AGENTS.md §7).
 */
export async function buildTeacherContext(
  teacherId: string,
  schoolId: string
): Promise<TeacherContext | null> {
  const supabase = await createClient();

  // Get teacher profile (school-scoped)
  const { data: teacher } = await supabase
    .from("teachers")
    .select(
      `
      id,
      subject,
      department,
      education_level,
      joined_at,
      profile:profiles(full_name)
    `
    )
    .eq("id", teacherId)
    .eq("school_id", schoolId)
    .single();

  if (!teacher) {
    return null;
  }

  // Get competencies
  const { data: competencies } = await supabase
    .from("teacher_competencies")
    .select(
      `
      score,
      assessed_at,
      competency:competencies(name, category)
    `
    )
    .eq("teacher_id", teacherId)
    .order("assessed_at", { ascending: false })
    .limit(20);

  // Get recent supervisions (last 5)
  const { data: supervisions } = await supabase
    .from("supervisions")
    .select(
      `
      supervision_date,
      overall_score,
      strengths,
      improvements,
      status,
      items:supervision_items(indicator, score, observation)
    `
    )
    .eq("teacher_id", teacherId)
    .order("supervision_date", { ascending: false })
    .limit(5);

  // Get recent coaching sessions (last 5)
  const { data: coaching } = await supabase
    .from("coaching_sessions")
    .select(
      `
      session_date,
      focus_area,
      summary,
      actions:coaching_actions(action, status, target_date, completed_date)
    `
    )
    .eq("teacher_id", teacherId)
    .order("session_date", { ascending: false })
    .limit(5);

  // Get growth history
  const { data: growth } = await supabase
    .from("teacher_growth_snapshots")
    .select(
      `
      period,
      overall_score,
      pedagogic_score,
      professional_score,
      assessment_score,
      classroom_score
    `
    )
    .eq("teacher_id", teacherId)
    .order("period", { ascending: true })
    .limit(10);

  const profileName =
    (teacher.profile as unknown as { full_name: string } | null)?.full_name ??
    "-";

  return {
    profile: {
      fullName: profileName,      subject: teacher.subject,
      department: teacher.department,
      educationLevel: teacher.education_level,
      joinedAt: teacher.joined_at,
    },
    competencies: (competencies ?? []).map((c) => {
      const comp = Array.isArray(c.competency) ? c.competency[0] : c.competency;
      return {
        name: (comp as { name: string } | null)?.name ?? "-",
        category: (comp as { category: string } | null)?.category ?? "-",
        score: c.score,
        assessedAt: c.assessed_at,
      };
    }),
    recentSupervisions: (supervisions ?? []).map((s) => ({
      date: s.supervision_date,
      overallScore: s.overall_score,
      strengths: s.strengths,
      improvements: s.improvements,
      status: s.status,
      items: (s.items ?? []).map((item) => ({
        indicator: item.indicator,
        score: item.score,
        observation: item.observation,
      })),
    })),
    recentCoaching: (coaching ?? []).map((c) => ({
      date: c.session_date,
      focusArea: c.focus_area,
      summary: c.summary,
      actions: (c.actions ?? []).map((a) => ({
        action: a.action,
        status: a.status,
        targetDate: a.target_date,
        completedDate: a.completed_date,
      })),
    })),
    growthHistory: (growth ?? []).map((g) => ({
      period: g.period,
      overallScore: g.overall_score,
      pedagogicScore: g.pedagogic_score,
      professionalScore: g.professional_score,
      assessmentScore: g.assessment_score,
      classroomScore: g.classroom_score,
    })),
  };
}

/**
 * Build context for AI School Insight feature.
 * Gathers school-wide data for analysis.
 */
export async function buildSchoolContext(
  schoolId: string
): Promise<SchoolInsightContext> {
  const empty: SchoolInsightContext = {
    teacherCount: 0,
    averageGrowth: null,
    supervisionStats: { total: 0, completed: 0, averageScore: null },
    competencyAverages: [],
    recentWarnings: [],
  };

  const supabase = await createClient();

  // Get teacher ids once (reused below; empty list must skip .in() queries)
  const { data: teacherRows } = await supabase
    .from("teachers")
    .select("id")
    .eq("school_id", schoolId);

  const teacherIds = teacherRows?.map((t) => t.id) ?? [];

  // Get teacher count
  const { count: teacherCount } = await supabase
    .from("teachers")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if (teacherIds.length === 0) {
    return { ...empty, teacherCount: teacherCount ?? 0 };
  }

  // Get latest growth snapshots for average
  const { data: latestGrowth } = await supabase
    .from("teacher_growth_snapshots")
    .select("overall_score, teacher_id")
    .in("teacher_id", teacherIds);

  const validScores =
    latestGrowth
      ?.map((g) => g.overall_score)
      .filter((s): s is number => s !== null) ?? [];

  const averageGrowth =
    validScores.length > 0
      ? Math.round(
          (validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100
        ) / 100
      : null;

  // Get supervision stats
  const { data: supervisions } = await supabase
    .from("supervisions")
    .select("status, overall_score")
    .eq("school_id", schoolId);

  const supervisionStats = {
    total: supervisions?.length ?? 0,
    completed:
      supervisions?.filter((s) => s.status === "completed").length ?? 0,
    averageScore: (() => {
      const scores =
        supervisions
          ?.map((s) => s.overall_score)
          .filter((s): s is number => s !== null) ?? [];
      return scores.length > 0
        ? Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
          ) / 100
        : null;
    })(),
  };

  // Get competency averages
  const { data: teacherCompetencies } = await supabase
    .from("teacher_competencies")
    .select(
      `
      score,
      competency:competencies(name, category)
    `
    )
    .in("teacher_id", teacherIds);

  const competencyMap = new Map<string, { scores: number[]; category: string }>();

  teacherCompetencies?.forEach((tc) => {
    const comp = Array.isArray(tc.competency) ? tc.competency[0] : tc.competency;
    const name = (comp as { name: string } | null)?.name;
    const category = (comp as { category: string } | null)?.category;
    if (name && category) {
      const existing = competencyMap.get(name) ?? { scores: [], category };
      existing.scores.push(tc.score);
      competencyMap.set(name, existing);
    }
  });

  const competencyAverages = Array.from(competencyMap.entries()).map(
    ([name, { scores, category }]) => ({
      name,
      category,
      averageScore:
        Math.round(
          (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
        ) / 100,
    })
  );

  // Get recent warnings
  const { data: warnings } = await supabase
    .from("early_warnings")
    .select(
      `
      type,
      severity,
      detected_at,
      teacher:teachers(profile:profiles(full_name))
    `
    )
    .eq("school_id", schoolId)
    .order("detected_at", { ascending: false })
    .limit(5);

  return {
    teacherCount: teacherCount ?? 0,
    averageGrowth,
    supervisionStats,
    competencyAverages,
    recentWarnings: (warnings ?? []).map((w) => {
      const teacherData = Array.isArray(w.teacher)
        ? w.teacher[0]
        : w.teacher;
      const teacherObj = teacherData as { profile?: { full_name: string }[] | { full_name: string } } | null;
      let profileName = "-";
      if (teacherObj?.profile) {
        if (Array.isArray(teacherObj.profile)) {
          profileName = teacherObj.profile[0]?.full_name ?? "-";
        } else {
          profileName = teacherObj.profile.full_name ?? "-";
        }
      }
      return {
        teacherName: profileName,
        type: w.type,
        severity: w.severity,
        detectedAt: w.detected_at,
      };
    }),
  };
}
