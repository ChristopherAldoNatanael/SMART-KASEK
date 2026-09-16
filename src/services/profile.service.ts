"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyTeacher, type TeacherWithProfile } from "./teacher.service";

export type MyCompetency = {
  name: string;
  category: string;
  score: number | null;
  assessedAt: string | null;
  source: string | null;
};

export type MySnapshot = {
  period: string;
  overall_score: number | null;
  pedagogic_score: number | null;
  professional_score: number | null;
  social_score: number | null;
  personality_score: number | null;
  digital_score: number | null;
  assessment_score: number | null;
  classroom_score: number | null;
};

export type MySupervision = {
  id: string;
  supervision_date: string;
  overall_score: number | null;
  status: string;
  strengths: string | null;
  improvements: string | null;
};

export type MyCoaching = {
  id: string;
  session_date: string;
  focus_area: string | null;
  status: string;
  pendingActions: number;
  completedActions: number;
};

export type MyProfileData = {
  teacher: TeacherWithProfile;
  competencies: MyCompetency[];
  snapshots: MySnapshot[];
  supervisions: MySupervision[];
  coachings: MyCoaching[];
};

/**
 * All "Profil Saya" data for the logged-in teacher, scoped to their
 * own teachers row. Returns null when the account isn't linked to
 * teacher data. Teachers never touch principal-gated services here.
 */
export async function getMyProfileData(): Promise<MyProfileData | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  const teacher = await getMyTeacher();
  if (!teacher) return null;

  const supabase = await createClient();
  const teacherId = teacher.id;

  const [{ data: competencies }, { data: snapshots }, { data: supervisions }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("teacher_competencies")
        .select(
          "score, assessed_at, source, competency:competencies(name, category, is_active)"
        )
        .eq("teacher_id", teacherId)
        .order("assessed_at", { ascending: false }),
      supabase
        .from("teacher_growth_snapshots")
        .select(
          "period, overall_score, pedagogic_score, professional_score, social_score, personality_score, digital_score, assessment_score, classroom_score"
        )
        .eq("teacher_id", teacherId)
        .order("period", { ascending: true }),
      supabase
        .from("supervisions")
        .select("id, supervision_date, overall_score, status, strengths, improvements")
        .eq("teacher_id", teacherId)
        .order("supervision_date", { ascending: false })
        .limit(10),
      supabase
        .from("coaching_sessions")
        .select(
          "id, session_date, focus_area, status, actions:coaching_actions(status)"
        )
        .eq("teacher_id", teacherId)
        .order("session_date", { ascending: false })
        .limit(10),
    ]);

  return {
    teacher,
    competencies: (competencies ?? [])
      .filter((c) => {
        const comp = c.competency as unknown as {
          is_active?: boolean | null;
        } | null;
        // Sembunyikan dimensi yang dinonaktifkan (00021);
        // baris yatim (master terhapus) tetap tampil apa adanya.
        return comp?.is_active !== false;
      })
      .map((c) => {
        const comp = c.competency as unknown as {
          name: string;
          category: string;
        } | null;
        return {
          name: comp?.name ?? "—",
          category: comp?.category ?? "—",
          score: c.score,
          assessedAt: c.assessed_at,
          source: c.source,
        };
      }),
    snapshots: (snapshots ?? []) as MySnapshot[],
    supervisions: (supervisions ?? []) as MySupervision[],
    coachings: (sessions ?? []).map((s) => {
      const actions = (s.actions ?? []) as { status: string }[];
      return {
        id: s.id,
        session_date: s.session_date,
        focus_area: s.focus_area,
        status: s.status,
        pendingActions: actions.filter(
          (a) => a.status === "pending" || a.status === "in_progress"
        ).length,
        completedActions: actions.filter((a) => a.status === "completed").length,
      };
    }),
  };
}
