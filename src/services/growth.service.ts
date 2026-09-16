"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePrincipal } from "@/lib/permissions";
import {
  average,
  dimensionColumnFor,
  getCurrentPeriod,
  round2,
  type GrowthScores,
} from "@/lib/growth";
import type { Database } from "@/types/database";

type GrowthSnapshot = Database["public"]["Tables"]["teacher_growth_snapshots"]["Row"];
type GrowthSnapshotInsert =
  Database["public"]["Tables"]["teacher_growth_snapshots"]["Insert"];

export type GrowthSnapshotWithScores = GrowthSnapshot;

export type GrowthTrend = {
  period: string;
  overallScore: number | null;
  pedagogicScore: number | null;
  professionalScore: number | null;
  socialScore: number | null;
  personalityScore: number | null;
  digitalScore: number | null;
  assessmentScore: number | null;
  classroomScore: number | null;
};

export type SchoolGrowthOverview = {
  teacherCount: number;
  averageOverall: number | null;
  positiveCount: number;
  attentionCount: number;
  teachers: {
    teacherId: string;
    name: string;
    subject: string | null;
    latest: GrowthSnapshot | null;
    previousOverall: number | null;
    growth: number | null;
  }[];
  trend: { period: string; average: number | null }[];
};

/**
 * Get all growth snapshots for a teacher.
 */
export async function getTeacherGrowthSnapshots(
  teacherId: string
): Promise<GrowthSnapshotWithScores[]> {
  const user = await requirePrincipal();
  if (!user.schoolId) return [];

  const supabase = await createClient();

  // Verify teacher belongs to user's school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  const { data, error } = await supabase
    .from("teacher_growth_snapshots")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("period", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get growth trend data for charting.
 */
export async function getTeacherGrowthTrend(
  teacherId: string
): Promise<GrowthTrend[]> {
  const snapshots = await getTeacherGrowthSnapshots(teacherId);

  return snapshots.map((snapshot) => ({
    period: snapshot.period,
    overallScore: snapshot.overall_score,
    pedagogicScore: snapshot.pedagogic_score,
    professionalScore: snapshot.professional_score,
    socialScore: snapshot.social_score,
    personalityScore: snapshot.personality_score,
    digitalScore: snapshot.digital_score,
    assessmentScore: snapshot.assessment_score,
    classroomScore: snapshot.classroom_score,
  }));
}

/**
 * Add a new growth snapshot for a teacher.
 */
export async function createGrowthSnapshot(input: {
  teacherId: string;
  period: string;
  overallScore?: number;
  pedagogicScore?: number;
  professionalScore?: number;
  socialScore?: number;
  personalityScore?: number;
  digitalScore?: number;
  assessmentScore?: number;
  classroomScore?: number;
}): Promise<GrowthSnapshot> {
  const user = await requirePrincipal();
  if (!user.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Verify teacher belongs to user's school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", input.teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  const snapshotData: GrowthSnapshotInsert = {
    teacher_id: input.teacherId,
    period: input.period,
    overall_score: input.overallScore ?? null,
    pedagogic_score: input.pedagogicScore ?? null,
    professional_score: input.professionalScore ?? null,
    social_score: input.socialScore ?? null,
    personality_score: input.personalityScore ?? null,
    digital_score: input.digitalScore ?? null,
    assessment_score: input.assessmentScore ?? null,
    classroom_score: input.classroomScore ?? null,
  };

  const { data, error } = await supabase
    .from("teacher_growth_snapshots")
    .insert(snapshotData)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get the latest growth snapshot for a teacher.
 */
export async function getLatestGrowthSnapshot(
  teacherId: string
): Promise<GrowthSnapshot | null> {
  const user = await requirePrincipal();
  if (!user.schoolId) return null;

  const supabase = await createClient();

  // Verify teacher belongs to user's school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  const { data, error } = await supabase
    .from("teacher_growth_snapshots")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("period", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

/**
 * Calculate growth percentage between two snapshots.
 */
export async function calculateGrowthPercentage(
  teacherId: string
): Promise<number | null> {
  const snapshots = await getTeacherGrowthSnapshots(teacherId);

  if (snapshots.length < 2) {
    return null;
  }

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];

  if (latest.overall_score === null || previous.overall_score === null) {
    return null;
  }

  const growth = latest.overall_score - previous.overall_score;
  return Math.round(growth * 100) / 100;
}

/**
 * Get school-wide growth average.
 */
export async function getSchoolGrowthAverage(): Promise<{
  teacherCount: number;
  averageOverall: number | null;
}> {
  const overview = await getSchoolGrowthOverview();
  return {
    teacherCount: overview.teacherCount,
    averageOverall: overview.averageOverall,
  };
}

/**
 * Deterministic growth engine (AGENTS.md §16-§17).
 *
 * Derives a teacher's growth snapshot from the database — never AI:
 * latest teacher_competencies score per competency, averaged per
 * dimension, overall = average of dimensions. Upserts the snapshot
 * for the current semester period (UNIQUE(teacher_id, period)).
 *
 * Returns null when the teacher has no competency data yet.
 */
export async function recalculateTeacherGrowth(
  teacherId: string
): Promise<GrowthSnapshot | null> {
  const user = await requirePrincipal();
  if (!user.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Verify teacher belongs to user's school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  // Latest score per competency (ordered newest-first, first wins)
  const { data: rows, error } = await supabase
    .from("teacher_competencies")
    .select("competency_id, score, assessed_at, competency:competencies(name)")
    .eq("teacher_id", teacherId)
    .order("assessed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const seen = new Set<string>();
  const buckets: Record<keyof GrowthScores, number[]> = {
    pedagogicScore: [],
    professionalScore: [],
    socialScore: [],
    personalityScore: [],
    digitalScore: [],
    assessmentScore: [],
    classroomScore: [],
  };

  for (const row of rows ?? []) {
    if (seen.has(row.competency_id)) continue;
    seen.add(row.competency_id);
    if (row.score === null) continue;
    const competency = row.competency as unknown as { name: string } | null;
    if (!competency?.name) continue;
    const column = dimensionColumnFor(competency.name);
    if (column) buckets[column].push(row.score);
  }

  const scores: GrowthScores = {
    pedagogicScore: average(buckets.pedagogicScore),
    professionalScore: average(buckets.professionalScore),
    socialScore: average(buckets.socialScore),
    personalityScore: average(buckets.personalityScore),
    digitalScore: average(buckets.digitalScore),
    assessmentScore: average(buckets.assessmentScore),
    classroomScore: average(buckets.classroomScore),
  };

  const overall = average(
    Object.values(scores).filter((s): s is number => s !== null)
  );

  if (overall === null) {
    return null;
  }

  const { data, error: upsertError } = await supabase
    .from("teacher_growth_snapshots")
    .upsert(
      {
        teacher_id: teacherId,
        period: getCurrentPeriod(),
        overall_score: overall,
        pedagogic_score: scores.pedagogicScore,
        professional_score: scores.professionalScore,
        social_score: scores.socialScore,
        personality_score: scores.personalityScore,
        digital_score: scores.digitalScore,
        assessment_score: scores.assessmentScore,
        classroom_score: scores.classroomScore,
      },
      { onConflict: "teacher_id,period" }
    )
    .select()
    .single();

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return data;
}

/**
 * Hitung ulang snapshot periode berjalan untuk SEMUA guru di sekolah
 * dari data kompetensi terkini. Dipakai tombol "Hitung Ulang" di
 * halaman /growth agar Kepala Sekolah bisa mengisi halaman yang
 * kosong tanpa menunggu trigger (nilai baru / coaching selesai).
 * Guru tanpa data kompetensi dilewati (tidak membuat snapshot kosong).
 */
export async function recalculateAllGrowth(): Promise<{
  total: number;
  updated: number;
  skipped: number;
}> {
  const user = await requirePrincipal();
  if (!user.schoolId) throw new Error("No school access");

  const supabase = await createClient();
  const { data: teachers, error } = await supabase
    .from("teachers")
    .select("id")
    .eq("school_id", user.schoolId);

  if (error) {
    throw new Error(error.message);
  }

  let updated = 0;
  let skipped = 0;
  for (const t of teachers ?? []) {
    try {
      const snapshot = await recalculateTeacherGrowth(t.id);
      if (snapshot) {
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      console.error("recalculateAllGrowth error for teacher:", t.id, err);
      skipped += 1;
    }
  }

  return { total: teachers?.length ?? 0, updated, skipped };
}

/**
 * School-wide growth overview in 2 queries (no N+1, AGENTS.md §27).
 */
export async function getSchoolGrowthOverview(): Promise<SchoolGrowthOverview> {
  const empty: SchoolGrowthOverview = {
    teacherCount: 0,
    averageOverall: null,
    positiveCount: 0,
    attentionCount: 0,
    teachers: [],
    trend: [],
  };

  const user = await requirePrincipal();
  if (!user.schoolId) return empty;

  const supabase = await createClient();

  const { data: teachers, error: teachersError } = await supabase
    .from("teachers")
    .select("id, subject, profile:profiles(full_name)")
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: true });

  if (teachersError) {
    throw new Error(teachersError.message);
  }

  if (!teachers || teachers.length === 0) {
    return empty;
  }

  const teacherIds = teachers.map((t) => t.id);

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("teacher_growth_snapshots")
    .select("*")
    .in("teacher_id", teacherIds)
    .order("period", { ascending: true });

  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  const byTeacher = new Map<string, GrowthSnapshot[]>();
  for (const snap of snapshots ?? []) {
    const list = byTeacher.get(snap.teacher_id) ?? [];
    list.push(snap);
    byTeacher.set(snap.teacher_id, list);
  }

  const overviewTeachers: SchoolGrowthOverview["teachers"] = [];
  const periodTotals = new Map<string, { sum: number; count: number }>();

  for (const t of teachers) {
    const snaps = byTeacher.get(t.id) ?? [];
    const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null;
    const previousOverall =
      snaps.length > 1 ? (snaps[snaps.length - 2].overall_score ?? null) : null;
    const growth =
      latest?.overall_score != null && previousOverall != null
        ? round2(latest.overall_score - previousOverall)
        : null;

    overviewTeachers.push({
      teacherId: t.id,
      name:
        (t.profile as unknown as { full_name: string | null } | null)
          ?.full_name ?? "Tanpa nama",
      subject: t.subject,
      latest,
      previousOverall,
      growth,
    });

    for (const snap of snaps) {
      if (snap.overall_score === null) continue;
      const agg = periodTotals.get(snap.period) ?? { sum: 0, count: 0 };
      agg.sum += snap.overall_score;
      agg.count += 1;
      periodTotals.set(snap.period, agg);
    }
  }

  const latestScores = overviewTeachers
    .map((t) => t.latest?.overall_score ?? null)
    .filter((s): s is number => s !== null);

  return {
    teacherCount: teachers.length,
    averageOverall: average(latestScores),
    positiveCount: overviewTeachers.filter(
      (t) => t.growth !== null && t.growth > 0
    ).length,
    attentionCount: overviewTeachers.filter(
      (t) => t.latest === null || (t.latest.overall_score ?? 100) < 70
    ).length,
    teachers: overviewTeachers,
    trend: Array.from(periodTotals.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([period, agg]) => ({
        period,
        average: agg.count > 0 ? round2(agg.sum / agg.count) : null,
      })),
  };
}
