"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Database } from "@/types/database";

type LessonPlan = Database["public"]["Tables"]["lesson_plans"]["Row"];
type LessonPlanInsert =
  Database["public"]["Tables"]["lesson_plans"]["Insert"];

export type LessonPlanWithTeacher = LessonPlan & {
  teacherName: string | null;
};

/**
 * Resolve the teachers-row id for the current user.
 * Returns null for principals (they act on chosen teachers, not as one).
 */
async function getOwnTeacherId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  schoolId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .single();
  return data?.id ?? null;
}

/**
 * List lesson plans.
 * Principal: all plans in the school (with teacher names) — this is the
 * integration point: data input by guru appears here automatically.
 * Teacher: own plans only.
 */
export async function getLessonPlans(): Promise<LessonPlanWithTeacher[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();

  if (user.role === "principal" || user.role === "admin") {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, profile:profiles(full_name)")
      .eq("school_id", user.schoolId);

    const ids = (teachers ?? []).map((t) => t.id);
    if (ids.length === 0) return [];

    const names = new Map(
      (teachers ?? []).map((t) => [
        t.id,
        (t.profile as unknown as { full_name: string | null } | null)
          ?.full_name ?? null,
      ])
    );

    const { data, error } = await supabase
      .from("lesson_plans")
      .select("*")
      .in("teacher_id", ids)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((l) => ({
      ...l,
      teacherName: names.get(l.teacher_id) ?? null,
    }));
  }

  // Teacher: own plans only
  const teacherId = await getOwnTeacherId(supabase, user.id, user.schoolId);
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({ ...l, teacherName: user.fullName }));
}

/**
 * Create a lesson plan.
 * Teachers always save as themselves (teacherId is ignored for safety).
 * Principals must pick the owning teacher.
 */
export async function createLessonPlan(input: {
  teacherId?: string;
  title: string;
  subject?: string;
  className?: string;
  semester?: string;
  description?: string;
  fileUrl?: string;
  status?: string;
}): Promise<LessonPlan> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();
  const isLeader = user.role === "principal" || user.role === "admin";

  let teacherId: string | null = null;

  if (isLeader) {
    if (!input.teacherId) throw new Error("Pilih guru pemilik modul ajar");
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", input.teacherId)
      .eq("school_id", user.schoolId)
      .single();
    if (!teacher) throw new Error("Guru tidak ditemukan");
    teacherId = teacher.id;
  } else {
    const ownId = await getOwnTeacherId(supabase, user.id, user.schoolId);
    if (!ownId) {
      throw new Error(
        "Data guru Anda belum terhubung. Minta Kepala Sekolah memastikan akun Anda tergabung."
      );
    }
    teacherId = ownId;
  }

  if (!teacherId) throw new Error("Guru tidak ditemukan");

  const row: LessonPlanInsert = {
    teacher_id: teacherId,
    title: input.title,
    subject: input.subject || null,
    class_name: input.className || null,
    semester: input.semester || null,
    description: input.description || null,
    file_url: input.fileUrl || null,
    status: input.status || "draft",
  };

  const { data, error } = await supabase
    .from("lesson_plans")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a lesson plan. Principal only (school-scoped).
 */
export async function deleteLessonPlan(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat menghapus modul ajar");
  }

  const supabase = await createClient();

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id")
    .eq("school_id", user.schoolId);
  const ids = (teachers ?? []).map((t) => t.id);
  if (ids.length === 0) throw new Error("Modul ajar tidak ditemukan");

  const { error } = await supabase
    .from("lesson_plans")
    .delete()
    .eq("id", id)
    .in("teacher_id", ids);

  if (error) throw new Error(error.message);
}
