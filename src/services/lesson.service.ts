"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import type { Database } from "@/types/database";

type LessonPlan = Database["public"]["Tables"]["lesson_plans"]["Row"];
type LessonPlanInsert =
  Database["public"]["Tables"]["lesson_plans"]["Insert"];
type LessonPlanUpdate =
  Database["public"]["Tables"]["lesson_plans"]["Update"];

export type LessonPlanWithTeacher = LessonPlan & {
  teacherName: string | null;
  /** URL unduh siap pakai (signed URL untuk path Storage). */
  downloadUrl: string | null;
  /** Nama berkas turunan dari path (tanpa prefix teknis). */
  fileName: string | null;
};

function fileNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dash = base.indexOf("-");
  return dash >= 0 ? base.slice(dash + 1) : base;
}

/** Ubah file_url (path Storage atau URL lama) menjadi URL unduh. */
async function resolveDownload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileUrl: string | null
): Promise<{ downloadUrl: string | null; fileName: string | null }> {
  if (!fileUrl) return { downloadUrl: null, fileName: null };
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return { downloadUrl: fileUrl, fileName: null };
  }
  const { data, error } = await supabase.storage
    .from("lesson-docs")
    .createSignedUrl(fileUrl, 3600);
  if (error || !data?.signedUrl) return { downloadUrl: null, fileName: fileNameFromPath(fileUrl) };
  return { downloadUrl: data.signedUrl, fileName: fileNameFromPath(fileUrl) };
}

  // Teacher: own plans only (resolved via shared helper)

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
      // Draft hanya terlihat pemiliknya; kepala sekolah melihat
      // yang dipublikasikan/diarsipkan.
      .in("status", ["published", "archived"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (l) => ({
        ...l,
        teacherName: names.get(l.teacher_id) ?? null,
        ...(await resolveDownload(supabase, l.file_url)),
      }))
    );
  }

  // Teacher: own plans only
  const teacherId = await getOwnTeacherId(user.id, user.schoolId);
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (l) => ({
      ...l,
      teacherName: user.fullName,
      ...(await resolveDownload(supabase, l.file_url)),
    }))
  );
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
  docUrl?: string;
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
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
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
    doc_url: input.docUrl || null,
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
 * Update a lesson plan (partial update — only provided keys change).
 * Teacher: own rows only. Principal: any row in school.
 */
export async function updateLessonPlan(
  id: string,
  input: {
    title?: string;
    subject?: string | null;
    className?: string | null;
    semester?: string | null;
    description?: string | null;
    fileUrl?: string | null;
    docUrl?: string | null;
    status?: string;
  }
): Promise<LessonPlan> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();
  const isLeader = user.role === "principal" || user.role === "admin";

  // Verify ownership within school.
  const { data: existing } = await supabase
    .from("lesson_plans")
    .select("id, teacher_id, file_url")
    .eq("id", id)
    .single();
  if (!existing) throw new Error("Modul ajar tidak ditemukan");

  if (isLeader) {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", existing.teacher_id)
      .eq("school_id", user.schoolId)
      .single();
    if (!teacher) throw new Error("Modul ajar tidak ditemukan");
  } else {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    if (!ownId || ownId !== existing.teacher_id) {
      throw new Error("Modul ajar tidak ditemukan");
    }
  }

  const updateData: LessonPlanUpdate = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.className !== undefined) updateData.class_name = input.className;
  if (input.semester !== undefined) updateData.semester = input.semester;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.fileUrl !== undefined) updateData.file_url = input.fileUrl;
  if (input.docUrl !== undefined) updateData.doc_url = input.docUrl;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from("lesson_plans")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Hapus berkas lama bila diganti (best effort).
  const oldPath = existing.file_url as string | null;
  const newPath = (updateData.file_url as string | null) ?? null;
  if (oldPath && newPath && oldPath !== newPath && !oldPath.startsWith("http")) {
    const { error: storageError } = await supabase.storage
      .from("lesson-docs")
      .remove([oldPath]);
    if (storageError) {
      console.error("lesson-docs remove error:", storageError.message);
    }
  }

  return data;
}

/**
 * Get one lesson plan if visible to the caller
 * (owner always; principal only if published/archived).
 */
export async function getLessonPlanById(
  id: string
): Promise<LessonPlanWithTeacher | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  const supabase = await createClient();
  const isLeader = user.role === "principal" || user.role === "admin";

  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*, teacher:teachers(id, profile:profiles(full_name))")
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") return null;
    throw new Error(error?.message ?? "Gagal memuat modul ajar");
  }

  const teacher = data.teacher as unknown as {
    id: string;
    profile: { full_name: string | null } | null;
  } | null;

  // Verify same-school ownership.
  const { data: owner } = await supabase
    .from("teachers")
    .select("id, profile_id")
    .eq("id", data.teacher_id)
    .eq("school_id", user.schoolId)
    .single();
  if (!owner) return null;

  // Draft hanya untuk pemilik.
  if (!isLeader) {
    if (owner.profile_id !== user.id) return null;
  } else if (data.status !== "published" && data.status !== "archived") {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    if (ownId !== data.teacher_id) return null;
  }

  const teacherName = teacher?.profile?.full_name ?? null;
  return {
    ...data,
    teacher,
    teacherName,
    ...(await resolveDownload(supabase, data.file_url)),
  };
}

/**
 * Submission stats: how many teachers submitted ≥1 published module.
 * Only published counts — drafts are private to their owners.
 */
export async function getLessonSubmissionStats(): Promise<{
  teacherCount: number;
  submittedCount: number;
  percent: number;
}> {
  const empty = { teacherCount: 0, submittedCount: 0, percent: 0 };
  const user = await getCurrentUser();
  if (!user?.schoolId) return empty;

  const supabase = await createClient();

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id")
    .eq("school_id", user.schoolId);
  const ids = (teachers ?? []).map((t) => t.id);
  if (ids.length === 0) return empty;

  const { data: published } = await supabase
    .from("lesson_plans")
    .select("teacher_id")
    .in("teacher_id", ids)
    .eq("status", "published");

  const submitted = new Set((published ?? []).map((p) => p.teacher_id)).size;
  return {
    teacherCount: ids.length,
    submittedCount: submitted,
    percent: Math.round((submitted / ids.length) * 100),
  };
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

  // Hapus baris + berkas Storage (kegagalan hapus berkas tidak menggagalkan).
  const { data: row } = await supabase
    .from("lesson_plans")
    .select("file_url")
    .eq("id", id)
    .in("teacher_id", ids)
    .single();

  const { error } = await supabase
    .from("lesson_plans")
    .delete()
    .eq("id", id)
    .in("teacher_id", ids);

  if (error) throw new Error(error.message);

  const path = row?.file_url as string | null;
  if (path && !path.startsWith("http")) {
    const { error: storageError } = await supabase.storage
      .from("lesson-docs")
      .remove([path]);
    if (storageError) {
      console.error("lesson-docs remove error:", storageError.message);
    }
  }
}
