"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { academicYearOptions } from "@/lib/students";
import { programProgress, type ProgramStatusValue } from "@/lib/programs";
import type { Database } from "@/types/database";

type Program = Database["public"]["Tables"]["programs"]["Row"];

export type ProgramWithProgress = Program & {
  progress: number | null;
  progressEstimated: boolean;
};

/**
 * Kalau kolom semester/tahun belum ada (migration 00036 belum jalan),
 * jelaskan dengan bahasa biasa + cara betulin, bukan error database mentah.
 */
function friendlyDbError(error: unknown, fallback: string): Error {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/programs\.(semester|academic_year)/i.test(msg) && /does not exist/i.test(msg)) {
    return new Error(
      "Database belum diperbarui. Buka Supabase → SQL Editor → jalankan isi file supabase/migrations/00036_programs_semester.sql, lalu muat ulang halaman ini."
    );
  }
  if (/row-level security|policy|permission denied/i.test(msg)) {
    return new Error(
      "Tidak diizinkan. Pastikan migration terbaru sudah dijalankan, lalu coba lagi."
    );
  }
  return new Error(msg || fallback);
}

async function requireProgramManager(): Promise<{ schoolId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  // Khusus Kepala Sekolah (admin lolos karena hierarki). Guru ditolak
  // di sini DAN di RLS (insert/update hanya principal/admin).
  if (!hasRole(user.role, "principal")) {
    throw new Error("Halaman ini khusus Kepala Sekolah");
  }
  return { schoolId: user.schoolId };
}

function withProgress(rows: Program[], today: Date): ProgramWithProgress[] {
  return rows.map((r) => {
    const p = programProgress(
      {
        status: r.status as ProgramStatusValue,
        start_date: r.start_date,
        end_date: r.end_date,
      },
      today
    );
    return { ...r, progress: p.percent, progressEstimated: p.estimated };
  });
}

export type ProgramFilter = {
  semester: 1 | 2;
  academicYear: string;
};

/**
 * Tahun pelajaran: yang pernah dipakai + setahun mundur + berjalan +
 * depan (terbaru dulu). Jadi mama bisa susun program tahun depan duluan.
 */
export async function getProgramYears(): Promise<string[]> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("academic_year")
    .eq("school_id", schoolId);
  if (error) throw friendlyDbError(error, "Gagal memuat daftar tahun");
  return academicYearOptions(
    ((data ?? []) as { academic_year: string | null }[]).map((r) => r.academic_year)
  );
}

/** Daftar program satu semester + progres (urut tanggal mulai). */
export async function listPrograms(filter: ProgramFilter): Promise<ProgramWithProgress[]> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("school_id", schoolId)
    .eq("semester", filter.semester)
    .eq("academic_year", filter.academicYear)
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw friendlyDbError(error, "Gagal memuat program");
  return withProgress((data ?? []) as Program[], new Date());
}

/** Ringkas untuk dashboard: daftar + rata-rata progres. */
export async function getProgramSummary(filter?: ProgramFilter): Promise<{
  programs: ProgramWithProgress[];
  overall: number | null;
  counts: { planned: number; ongoing: number; completed: number; cancelled: number };
}> {
  const programs = filter ? await listPrograms(filter) : await listAllPrograms();
  const counts = { planned: 0, ongoing: 0, completed: 0, cancelled: 0 };
  const percents: number[] = [];
  for (const p of programs) {
    if (p.status === "planned") counts.planned++;
    else if (p.status === "ongoing") counts.ongoing++;
    else if (p.status === "completed") counts.completed++;
    else counts.cancelled++;
    if (p.progress !== null) percents.push(p.progress);
  }
  return {
    programs,
    overall:
      percents.length > 0
        ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
        : null,
    counts,
  };
}

/** Daftar SEMUA program (untuk ringkasan global). */
async function listAllPrograms(): Promise<ProgramWithProgress[]> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw friendlyDbError(error, "Gagal memuat program");
  return withProgress((data ?? []) as Program[], new Date());
}

/** Tambah program — selalu mulai sebagai Direncanakan. */
export async function createProgram(input: {
  name: string;
  category?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  semester: 1 | 2;
  academicYear: string;
}): Promise<Program> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .insert({
      school_id: schoolId,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      status: "planned",
      budget: input.budget ?? null,
      semester: input.semester,
      academic_year: input.academicYear,
    })
    .select("*")
    .single();
  if (error || !data) throw friendlyDbError(error, "Gagal menambah program");
  return data as Program;
}

async function loadOwnedProgram(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  programId: string
): Promise<Program> {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .single();
  if (error || !data) throw new Error("Program tidak ditemukan");
  const row = data as Program;
  if (row.school_id !== schoolId) throw new Error("Anda tidak memiliki akses ke program ini");
  return row;
}

/** Pindah status lifecycle (Mulai/Selesai/Batalkan/Buka lagi). */
export async function updateProgramStatus(
  programId: string,
  status: ProgramStatusValue
): Promise<Program> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  await loadOwnedProgram(supabase, schoolId, programId);
  const { data, error } = await supabase
    .from("programs")
    .update({ status })
    .eq("id", programId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Gagal mengubah status");
  return data as Program;
}

/** Ubah detail program (nama, kategori, deskripsi, tanggal, anggaran, semester). */
export async function updateProgramDetails(input: {
  programId: string;
  name: string;
  category?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  semester: 1 | 2;
  academicYear: string;
}): Promise<Program> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  await loadOwnedProgram(supabase, schoolId, input.programId);
  const { data, error } = await supabase
    .from("programs")
    .update({
      name: input.name.trim(),
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      budget: input.budget ?? null,
      semester: input.semester,
      academic_year: input.academicYear,
    })
    .eq("id", input.programId)
    .select("*")
    .single();
  if (error || !data) throw friendlyDbError(error, "Gagal menyimpan perubahan");
  return data as Program;
}

/**
 * Hapus permanen (Kepala Sekolah, milik sekolah sendiri).
 * RLS programs_delete mengizinkan admin + principal se-sekolah.
 * Batalkan (status) tetap tersedia untuk riwayat; Hapus untuk salah input.
 */
export async function deleteProgram(programId: string): Promise<{ name: string }> {
  const { schoolId } = await requireProgramManager();
  const supabase = await createClient();
  const row = await loadOwnedProgram(supabase, schoolId, programId);
  const { error } = await supabase.from("programs").delete().eq("id", programId);
  if (error) throw friendlyDbError(error, "Gagal menghapus program");
  return { name: row.name };
}
