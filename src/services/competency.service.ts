"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePrincipal } from "@/lib/permissions";
import type { Database } from "@/types/database";

type Competency = Database["public"]["Tables"]["competencies"]["Row"];
type CompetencyInsert = Database["public"]["Tables"]["competencies"]["Insert"];
type TeacherCompetency = Database["public"]["Tables"]["teacher_competencies"]["Row"];
type TeacherCompetencyInsert =
  Database["public"]["Tables"]["teacher_competencies"]["Insert"];

export type TeacherCompetencyWithDetails = TeacherCompetency & {
  competency: Pick<Competency, "name" | "category" | "weight"> | null;
};

/**
 * Get all master competencies.
 */
export async function getCompetencies(): Promise<Competency[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competencies")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get competencies for a specific teacher.
 */
export async function getTeacherCompetencies(
  teacherId: string
): Promise<TeacherCompetencyWithDetails[]> {
  const user = await requirePrincipal();
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
    .from("teacher_competencies")
    .select(
      `
      *,
      competency:competencies(name, category, weight)
    `
    )
    .eq("teacher_id", teacherId)
    .order("assessed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as TeacherCompetencyWithDetails[];
}

/**
 * Add or update a competency score for a teacher.
 */
export async function upsertTeacherCompetency(input: {
  teacherId: string;
  competencyId: string;
  score: number;
  source?: Database["public"]["Tables"]["teacher_competencies"]["Row"]["source"];
  notes?: string;
}): Promise<TeacherCompetency> {
  const user = await requirePrincipal();
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

  const competencyData: TeacherCompetencyInsert = {
    teacher_id: input.teacherId,
    competency_id: input.competencyId,
    score: input.score,
    source: input.source || "manual",
    assessed_by: user.id,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from("teacher_competencies")
    .insert(competencyData)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get competency summary for a teacher (latest score per competency).
 */
export async function getTeacherCompetencySummary(
  teacherId: string
): Promise<
  {
    competencyId: string;
    name: string;
    category: string;
    weight: number;
    latestScore: number | null;
    assessedAt: string | null;
  }[]
> {
  const user = await requirePrincipal();
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

  // Get all active competencies
  const competencies = await getCompetencies();

  // Get latest score for each competency
  const summary = await Promise.all(
    competencies.map(async (competency) => {
      const { data } = await supabase
        .from("teacher_competencies")
        .select("score, assessed_at")
        .eq("teacher_id", teacherId)
        .eq("competency_id", competency.id)
        .order("assessed_at", { ascending: false })
        .limit(1)
        .single();

      return {
        competencyId: competency.id,
        name: competency.name,
        category: competency.category,
        weight: competency.weight,
        latestScore: data?.score ?? null,
        assessedAt: data?.assessed_at ?? null,
      };
    })
  );

  return summary;
}
