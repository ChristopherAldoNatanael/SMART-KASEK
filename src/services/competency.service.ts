"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePrincipal } from "@/lib/permissions";
import { withRequestCache } from "@/lib/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Competency = Database["public"]["Tables"]["competencies"]["Row"];
type CompetencyInsert = Database["public"]["Tables"]["competencies"]["Insert"];
type TeacherCompetency = Database["public"]["Tables"]["teacher_competencies"]["Row"];
type TeacherCompetencyInsert =
  Database["public"]["Tables"]["teacher_competencies"]["Insert"];

export type TeacherCompetencyWithDetails = TeacherCompetency & {
  competency: Pick<Competency, "name" | "category" | "weight"> | null;
};

async function fetchActiveCompetencies(
  db: SupabaseClient
): Promise<Competency[]> {
  const { data, error } = await db
    .from("competencies")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Competency[];
}

/**
 * Get all master competencies.
 * Master global yang jarang berubah → di-cache 10 menit (per user,
 * tetap dalam konteks RLS). Tidak ada mutasi master di aplikasi,
 * sehingga tidak butuh invalidasi selain TTL.
 */
export async function getCompetencies(): Promise<Competency[]> {
  return withRequestCache(
    ["competencies"],
    600,
    ["competencies"],
    (db) => fetchActiveCompetencies(db),
    async () => {
      const supabase = await createClient();
      return fetchActiveCompetencies(supabase as unknown as SupabaseClient);
    }
  );
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
    source: string | null;
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

  // Satu query untuk semua nilai guru ini (dulu N+1: satu query per
  // kompetensi). Baris terbaru per kompetensi diambil di JS.
  const { data: scores, error: scoresError } = await supabase
    .from("teacher_competencies")
    .select("competency_id, score, assessed_at, source")
    .eq("teacher_id", teacherId)
    .order("assessed_at", { ascending: false });
  if (scoresError) throw new Error(scoresError.message);

  const latestByCompetency = new Map<
    string,
    { score: number | null; assessed_at: string | null; source: string | null }
  >();
  for (const row of (scores ?? []) as {
    competency_id: string;
    score: number | null;
    assessed_at: string | null;
    source: string | null;
  }[]) {
    if (!latestByCompetency.has(row.competency_id)) {
      latestByCompetency.set(row.competency_id, {
        score: row.score,
        assessed_at: row.assessed_at,
        source: row.source,
      });
    }
  }

  return competencies.map((competency) => {
    const latest = latestByCompetency.get(competency.id);
    return {
      competencyId: competency.id,
      name: competency.name,
      category: competency.category,
      weight: competency.weight,
      latestScore: latest?.score ?? null,
      assessedAt: latest?.assessed_at ?? null,
      source: latest?.source ?? null,
    };
  });
}
