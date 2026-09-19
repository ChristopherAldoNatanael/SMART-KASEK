"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { requirePrincipal } from "@/lib/permissions";
import { getOwnTeacherId } from "./teacher.service";
import type { Database } from "@/types/database";

type Supervision = Database["public"]["Tables"]["supervisions"]["Row"];
type SupervisionInsert = Database["public"]["Tables"]["supervisions"]["Insert"];
type SupervisionUpdate = Database["public"]["Tables"]["supervisions"]["Update"];
type SupervisionItem = Database["public"]["Tables"]["supervision_items"]["Row"];
type SupervisionItemInsert =
  Database["public"]["Tables"]["supervision_items"]["Insert"];

export type SupervisionWithDetails = Supervision & {
  teacher: { id: string; profile: { full_name: string | null } | null } | null;
  supervisor: { id: string; full_name: string | null } | null;
};

/**
 * Resolve the own-teachers-row filter for teacher role.
 * Returns the teacher id, or null when the account has no teacher data
 * (teacher then sees an empty list — never other teachers' rows).
 */
async function teacherScope(
  role: string,
  profileId: string,
  schoolId: string
): Promise<{ scoped: boolean; teacherId: string | null }> {
  if (role !== "teacher") return { scoped: false, teacherId: null };
  return { scoped: true, teacherId: await getOwnTeacherId(profileId, schoolId) };
}

/**
 * Get supervisions: full school for principal, own rows only for teacher.
 */
export async function getSupervisions(): Promise<SupervisionWithDetails[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();
  const scope = await teacherScope(user.role, user.id, user.schoolId);
  if (scope.scoped && !scope.teacherId) return [];

  let query = supabase
    .from("supervisions")
    .select(
      `
      *,
      teacher:teachers(id, profile:profiles(full_name)),
      supervisor:profiles(full_name)
    `
    )
    .eq("school_id", user.schoolId)
    .order("supervision_date", { ascending: false });

  if (scope.scoped && scope.teacherId) {
    query = query.eq("teacher_id", scope.teacherId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as SupervisionWithDetails[];
}

/**
 * Get a single supervision by ID with all details.
 */
export async function getSupervisionById(
  id: string
): Promise<SupervisionWithDetails | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  const supabase = await createClient();
  const scope = await teacherScope(user.role, user.id, user.schoolId);
  if (scope.scoped && !scope.teacherId) return null;

  let query = supabase
    .from("supervisions")
    .select(
      `
      *,
      teacher:teachers(id, profile:profiles(full_name)),
      supervisor:profiles(full_name)
    `
    )
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (scope.scoped && scope.teacherId) {
    query = query.eq("teacher_id", scope.teacherId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data as SupervisionWithDetails;
}

/**
 * Get supervisions for a specific teacher.
 */
export async function getTeacherSupervisions(
  teacherId: string
): Promise<Supervision[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  // Teacher role may only query their own rows.
  if (user.role === "teacher") {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    if (ownId !== teacherId) throw new Error("Guru tidak ditemukan");
  }

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
    .from("supervisions")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("supervision_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Create a new supervision.
 */
export async function createSupervision(input: {
  teacherId: string;
  supervisionDate: string;
  type?: string;
  summary?: string;
  strengths?: string;
  improvements?: string;
  status?: Database["public"]["Tables"]["supervisions"]["Row"]["status"];
  items?: {
    indicator: string;
    category?: string;
    score?: number;
    observation?: string;
    recommendation?: string;
  }[];
}): Promise<Supervision> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

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

  // Calculate overall score from items if provided
  let overallScore: number | null = null;
  if (input.items && input.items.length > 0) {
    const scores = input.items
      .map((item) => item.score)
      .filter((score): score is number => score !== undefined);
    if (scores.length > 0) {
      overallScore =
        Math.round(
          (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
        ) / 100;
    }
  }

  const supervisionData: SupervisionInsert = {
    school_id: user.schoolId,
    teacher_id: input.teacherId,
    supervisor_id: user.id,
    supervision_date: input.supervisionDate,
    type: input.type || null,
    overall_score: overallScore,
    summary: input.summary || null,
    strengths: input.strengths || null,
    improvements: input.improvements || null,
    status: input.status || "draft",
  };

  const { data, error } = await supabase
    .from("supervisions")
    .insert(supervisionData)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Insert supervision items if provided
  if (input.items && input.items.length > 0) {
    const itemsData: SupervisionItemInsert[] = input.items.map((item) => ({
      supervision_id: data.id,
      indicator: item.indicator,
      category: item.category || null,
      score: item.score || null,
      observation: item.observation || null,
      recommendation: item.recommendation || null,
    }));

    const { error: itemsError } = await supabase
      .from("supervision_items")
      .insert(itemsData);

    if (itemsError) {
      throw new Error(`Gagal menambahkan item: ${itemsError.message}`);
    }
  }

  return data;
}

/**
 * Update a supervision.
 */
export async function updateSupervision(
  id: string,
  input: {
    supervisionDate?: string;
    type?: string;
    overallScore?: number;
    summary?: string;
    strengths?: string;
    improvements?: string;
    status?: Database["public"]["Tables"]["supervisions"]["Row"]["status"];
  }
): Promise<Supervision> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const supervision = await getSupervisionById(id);
  if (!supervision) {
    throw new Error("Supervisi tidak ditemukan");
  }

  const updateData: SupervisionUpdate = {};
  if (input.supervisionDate !== undefined)
    updateData.supervision_date = input.supervisionDate;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.overallScore !== undefined)
    updateData.overall_score = input.overallScore;
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.strengths !== undefined) updateData.strengths = input.strengths;
  if (input.improvements !== undefined)
    updateData.improvements = input.improvements;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from("supervisions")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", user.schoolId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a supervision (plus documents and instrument assessment via
 * database cascade). Requires principal role.
 */
export async function deleteSupervision(id: string): Promise<void> {
  const user = await requirePrincipal();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const supervision = await getSupervisionById(id);
  if (!supervision) {
    throw new Error("Supervisi tidak ditemukan");
  }

  const { data: docs } = await supabase
    .from("supervision_documents")
    .select("file_path")
    .eq("supervision_id", id);

  const { data: deleted, error } = await supabase
    .from("supervisions")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!deleted || deleted.length === 0) {
    throw new Error(
      "Supervisi tidak terhapus (akses ditolak RLS atau data tidak ditemukan)"
    );
  }

  // Bersihkan berkas Storage (best effort, DB sudah cascade).
  const paths = (docs ?? []).map((d) => d.file_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("supervision-docs")
      .remove(paths);
    if (storageError) {
      console.error("supervision-docs remove error:", storageError.message);
    }
  }
}

/** Filter jenis supervisi untuk daftar & statistik halaman. */
export type SupervisionKind = "akademik" | "manajerial" | "all";

const EMPTY_SUPERVISION_STATS = {
  total: 0,
  draft: 0,
  completed: 0,
  followUp: 0,
  closed: 0,
  averageScore: null as number | null,
};

/**
 * Get supervision statistics for the school.
 * kind="akademik" menghitung baris non-manajerial saja (selaras tabel
 * /supervision). Bila kolom kind belum ada (migrasi 00022), jatuh kembali
 * ke perilaku lama (semua baris) agar tidak error.
 */
export async function getSupervisionStats(
  kind: SupervisionKind = "all"
): Promise<{
  total: number;
  draft: number;
  completed: number;
  followUp: number;
  closed: number;
  averageScore: number | null;
}> {
  const user = await getCurrentUser();
  if (!user?.schoolId) {
    return { ...EMPTY_SUPERVISION_STATS };
  }

  const supabase = await createClient();
  const scope = await teacherScope(user.role, user.id, user.schoolId);
  if (scope.scoped && !scope.teacherId) {
    return { ...EMPTY_SUPERVISION_STATS };
  }

  const fetchRows = (useKindFilter: boolean) => {
    let query = supabase
      .from("supervisions")
      .select("status, overall_score")
      .eq("school_id", user.schoolId);

    if (scope.scoped && scope.teacherId) {
      query = query.eq("teacher_id", scope.teacherId);
    }
    if (useKindFilter && kind === "akademik") {
      query = query.neq("kind", "managerial");
    }
    if (useKindFilter && kind === "manajerial") {
      query = query.eq("kind", "managerial");
    }
    return query;
  };

  // Kolom kind belum ada (migrasi 00022) → PostgREST error → fallback
  // ke semua baris (perilaku lama), bukan halaman error.
  let data: { status: string; overall_score: number | null }[] | null = null;
  try {
    const res = await fetchRows(kind !== "all");
    if (!res.error) data = res.data ?? [];
  } catch {
    data = null;
  }
  if (!data) {
    const res = await fetchRows(false);
    if (res.error) throw new Error(res.error.message);
    data = res.data ?? [];
  }

  const stats = {
    total: data.length,
    draft: 0,
    completed: 0,
    followUp: 0,
    closed: 0,
    averageScore: null as number | null,
  };

  const scores: number[] = [];

  for (const item of data) {
    if (item.status === "draft") stats.draft++;
    if (item.status === "completed") stats.completed++;
    if (item.status === "follow_up") stats.followUp++;
    if (item.status === "closed") stats.closed++;

    if (item.overall_score !== null) {
      scores.push(item.overall_score);
    }
  }

  if (scores.length > 0) {
    stats.averageScore =
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
      100;
  }

  return stats;
}

export type SupervisionPageResult = {
  rows: SupervisionWithDetails[];
  /** Null bila total tak dapat dihitung (lingkungan tanpa migrasi lengkap). */
  total: number | null;
  page: number;
  pageSize: number;
};

/**
 * Daftar supervisi per halaman (untuk tabel /supervision).
 * Statistik strip atas tetap lewat getSupervisionStats agar angkanya utuh.
 */
export async function getSupervisionsPage(
  kind: SupervisionKind = "akademik",
  page = 1,
  pageSize = 20
): Promise<SupervisionPageResult> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(100, Math.floor(pageSize))
      : 20;

  const user = await getCurrentUser();
  if (!user?.schoolId) {
    return { rows: [], total: 0, page: safePage, pageSize: safeSize };
  }

  const supabase = await createClient();
  const scope = await teacherScope(user.role, user.id, user.schoolId);
  if (scope.scoped && !scope.teacherId) {
    return { rows: [], total: 0, page: safePage, pageSize: safeSize };
  }

  const applyFilters = (
    useKindFilter: boolean,
    base: "count" | "rows",
    from = 0
  ) => {
    if (base === "count") {
      let q = supabase
        .from("supervisions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", user.schoolId);
      if (scope.scoped && scope.teacherId) {
        q = q.eq("teacher_id", scope.teacherId);
      }
      if (useKindFilter && kind === "akademik") {
        q = q.neq("kind", "managerial");
      }
      if (useKindFilter && kind === "manajerial") {
        q = q.eq("kind", "managerial");
      }
      return q;
    }
    let q = supabase
      .from("supervisions")
      .select(
        `
        *,
        teacher:teachers(id, profile:profiles(full_name)),
        supervisor:profiles(full_name)
      `
      )
      .eq("school_id", user.schoolId)
      .order("supervision_date", { ascending: false })
      .range(from, from + safeSize - 1);
    if (scope.scoped && scope.teacherId) {
      q = q.eq("teacher_id", scope.teacherId);
    }
    if (useKindFilter && kind === "akademik") {
      q = q.neq("kind", "managerial");
    }
    if (useKindFilter && kind === "manajerial") {
      q = q.eq("kind", "managerial");
    }
    return q;
  };

  // Coba dengan filter kind; bila kolom belum ada, fallback tanpa filter
  // + saring di JS (total menjadi null → pager disembunyikan).
  try {
    const countRes = await applyFilters(kind !== "all", "count");
    if (countRes.error) throw new Error(countRes.error.message);
    const from = (safePage - 1) * safeSize;
    const rowsRes = await applyFilters(kind !== "all", "rows", from);
    if (rowsRes.error) throw new Error(rowsRes.error.message);
    return {
      rows: (rowsRes.data ?? []) as SupervisionWithDetails[],
      total: countRes.count ?? 0,
      page: safePage,
      pageSize: safeSize,
    };
  } catch {
    if (kind === "all") throw new Error("Gagal memuat supervisi");
    const from = (safePage - 1) * safeSize;
    const rowsRes = await applyFilters(false, "rows", from);
    if (rowsRes.error) throw new Error(rowsRes.error.message);
    const all = (rowsRes.data ?? []) as (SupervisionWithDetails & {
      kind?: string | null;
    })[];
    const filtered =
      kind === "akademik"
        ? all.filter((r) => r.kind !== "managerial")
        : all.filter((r) => r.kind === "managerial");
    return { rows: filtered, total: null, page: safePage, pageSize: safeSize };
  }
}
