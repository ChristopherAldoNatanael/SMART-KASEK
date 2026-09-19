"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { academicYearOptions, currentAcademicYear } from "@/lib/students";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

export type StudentFilters = {
  academicYear: string;
  className: string | null;
  search: string | null;
  /**
   * Batasan kelas (untuk akun guru: wali + yang diajar).
   * Null = tanpa batas (Kepala Sekolah/Admin).
   */
  allowedClasses?: string[] | null;
};

function normYear(row: { academic_year?: string | null }): string {
  const y = row.academic_year?.trim();
  return y || currentAcademicYear();
}

async function requireSchoolUser(): Promise<{ schoolId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "principal" && user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Anda tidak memiliki akses ke data siswa");
  }
  return { schoolId: user.schoolId };
}

/** Ambil 1 baris siswa milik sekolah (null bila bukan milik sekolah). */
async function getOwnedStudent(id: string, schoolId: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Student;
}

/* --------------------------------- Query -------------------------------- */

/**
 * Daftar siswa satu sekolah + data filter.
 * Filter tahun/kelas/pencarian dikerjakan di sini agar halaman tipis.
 * Kolom academic_year dibaca toleran (baris lama tanpa tahun dianggap
 * tahun berjalan) sehingga aman sebelum/sesudah migrasi 00024.
 */
export type ClassCount = {
  name: string | null;
  total: number;
  male: number;
  female: number;
};

export async function getStudents(filters: StudentFilters): Promise<{
  rows: Student[];
  years: string[];
  classes: string[];
  classCounts: ClassCount[];
  stats: { total: number; male: number; female: number; classCount: number };
}> {
  const { schoolId } = await requireSchoolUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .order("class_name", { ascending: true })
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);

  const all = (data ?? []) as Student[];
  const years = academicYearOptions(all.map((r) => r.academic_year ?? null));
  const inYear = all
    .filter((r) => normYear(r) === filters.academicYear)
    .filter(
      (r) =>
        !filters.allowedClasses ||
        filters.allowedClasses.includes((r.class_name ?? "").trim())
    );
  const classes = Array.from(
    new Set(inYear.map((r) => (r.class_name ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "id"));

  const q = (filters.search ?? "").trim().toLowerCase();
  const rows = inYear.filter((r) => {
    if (filters.className && (r.class_name ?? "").trim() !== filters.className)
      return false;
    if (!q) return true;
    return (
      r.full_name.toLowerCase().includes(q) ||
      (r.student_number ?? "").toLowerCase().includes(q) ||
      (r.no_induk ?? "").toLowerCase().includes(q)
    );
  });

  const byClass = new Map<string, Student[]>();
  for (const r of inYear) {
    const key = (r.class_name ?? "").trim();
    const list = byClass.get(key) ?? [];
    list.push(r);
    byClass.set(key, list);
  }
  const classCounts: ClassCount[] = Array.from(byClass.entries())
    .map(([key, list]) => ({
      name: key || null,
      total: list.length,
      male: list.filter((r) => r.gender === "male").length,
      female: list.filter((r) => r.gender === "female").length,
    }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "id"));

  return {
    rows,
    years,
    classes,
    classCounts,
    stats: {
      total: inYear.length,
      male: inYear.filter((r) => r.gender === "male").length,
      female: inYear.filter((r) => r.gender === "female").length,
      classCount: classes.length,
    },
  };
}

export type StudentListMeta = {
  years: string[];
  classes: string[];
  classCounts: ClassCount[];
  stats: { total: number; male: number; female: number; classCount: number };
};

type StudentMetaRow = {
  academic_year: string | null;
  class_name: string | null;
  gender: string | null;
};

/**
 * Meta ringan untuk halaman Data Siswa (kartu kelas + filter + statistik).
 * Hanya 3 kolom kecil — dipakai bersama getStudentRowsPage agar tabel besar
 * tidak perlu memuat seluruh baris. allowedClasses = pembatas guru
 * (null = akses penuh Kepsek/Admin). Logika agregasi SAMA dengan getStudents.
 */
export async function getStudentListMeta(
  academicYear: string,
  allowedClasses?: string[] | null
): Promise<StudentListMeta> {
  const { schoolId } = await requireSchoolUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("academic_year, class_name, gender")
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  const all = (data ?? []) as StudentMetaRow[];
  const years = academicYearOptions(all.map((r) => r.academic_year ?? null));
  const inYear = all
    .filter((r) => normYear(r) === academicYear)
    .filter(
      (r) =>
        !allowedClasses ||
        allowedClasses.includes((r.class_name ?? "").trim())
    );
  const classes = Array.from(
    new Set(inYear.map((r) => (r.class_name ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "id"));

  const byClass = new Map<string, StudentMetaRow[]>();
  for (const r of inYear) {
    const key = (r.class_name ?? "").trim();
    const list = byClass.get(key) ?? [];
    list.push(r);
    byClass.set(key, list);
  }
  const classCounts: ClassCount[] = Array.from(byClass.entries())
    .map(([key, list]) => ({
      name: key || null,
      total: list.length,
      male: list.filter((r) => r.gender === "male").length,
      female: list.filter((r) => r.gender === "female").length,
    }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "id"));

  return {
    years,
    classes,
    classCounts,
    stats: {
      total: inYear.length,
      male: inYear.filter((r) => r.gender === "male").length,
      female: inYear.filter((r) => r.gender === "female").length,
      classCount: classes.length,
    },
  };
}

/** Escape pola ilike + buang kutip ganda (perusak sintaks .or()). */
function escapeIlike(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, "");
}

export type StudentRowsPageResult = {
  rows: Student[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Baris tabel siswa per halaman dengan filter di SQL (tahun + kelas +
 * pencarian). NULL academic_year diperlakukan sebagai tahun berjalan,
 * selaras normYear() di getStudents.
 *
 * Dipakai jalur Kepsek/Admin (tanpa batas kelas). Jalur guru (daftar
 * kecil milik sendiri) tetap memakai getStudents agar scoping kelas
 * lewat allowedClasses tidak berubah perilakunya.
 */
export async function getStudentRowsPage(input: {
  academicYear: string;
  className: string | null;
  search: string | null;
  page?: number;
  pageSize?: number;
}): Promise<StudentRowsPageResult> {
  const safePage =
    Number.isFinite(input.page) && (input.page as number) > 0
      ? Math.floor(input.page as number)
      : 1;
  const safeSize =
    Number.isFinite(input.pageSize) && (input.pageSize as number) > 0
      ? Math.min(100, Math.floor(input.pageSize as number))
      : 20;

  const { schoolId } = await requireSchoolUser();
  const supabase = await createClient();
  const year = (input.academicYear || "").trim() || currentAcademicYear();
  const className = (input.className ?? "").trim();
  const search = (input.search ?? "").trim();

  // Filter diterapkan lewat builder agar dipakai identik oleh
  // query count dan query baris (cast lokal karena tiap tahap builder
  // punya tipe berbeda di supabase-js).
  type Filterable = {
    eq: (c: string, v: string) => Filterable;
    or: (s: string) => Filterable;
  };
  const applyFilters = <T>(base: T): T => {
    let q = base as unknown as Filterable;
    if (year === currentAcademicYear()) {
      q = q.or(`academic_year.eq."${year}",academic_year.is.null`);
    } else {
      q = q.eq("academic_year", year);
    }
    if (className) q = q.eq("class_name", className);
    if (search) {
      const e = escapeIlike(search);
      q = q.or(
        `full_name.ilike."%${e}%",student_number.ilike."%${e}%",no_induk.ilike."%${e}%"`
      );
    }
    return q as unknown as T;
  };

  const countQuery = applyFilters(
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
  );
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);

  const from = (safePage - 1) * safeSize;
  const rowsQuery = applyFilters(
    supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true })
      .range(from, from + safeSize - 1)
  );
  const { data, error } = await rowsQuery;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as Student[],
    total: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  };
}

export type ImportOutcome = {
  inserted: number;
  skipped: number;
  failed: { name: string; message: string }[];
};

/* ---------------------------- Hapus massal ------------------------------ */

/**
 * Hapus permanen seluruh siswa pada kelas-kelas terpilih dalam 1 tahun
 * ajaran (Kepala Sekolah). Pengaman ganda:
 * - expectedTotal harus sama persis dengan jumlah di database saat
 *   eksekusi — bila data berubah (ada yang menambah/menghapus),
 *   proses ditolak agar tidak menghapus berdasarkan layar basi.
 * - Hanya baris milik sekolah yang disentuh (school_id selalu dicek).
 */
export async function bulkDeleteStudents(input: {
  academicYear: string;
  classNames: string[];
  expectedTotal: number;
}): Promise<{ deleted: number; classes: string[] }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat menghapus data kelas");
  }

  // "" = kelompok "Tanpa kelas", jadi sengaja tidak dibuang.
  const targets = Array.from(new Set(input.classNames.map((c) => c.trim())));
  if (targets.length === 0) throw new Error("Pilih minimal 1 kelas");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, class_name, academic_year")
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);

  const matched = ((data ?? []) as Pick<Student, "id" | "class_name" | "academic_year">[]).filter(
    (r) =>
      normYear(r) === input.academicYear &&
      targets.includes((r.class_name ?? "").trim())
  );

  if (matched.length === 0) {
    throw new Error("Tidak ada data siswa pada kelas dan tahun tersebut");
  }
  if (matched.length !== input.expectedTotal) {
    throw new Error(
      `Jumlah data berubah (${input.expectedTotal} → ${matched.length}). Muat ulang halaman dan periksa lagi sebelum menghapus.`
    );
  }

  const ids = matched.map((r) => r.id);
  const { error: delError } = await supabase
    .from("students")
    .delete()
    .eq("school_id", user.schoolId)
    .in("id", ids);
  if (delError) throw new Error(delError.message);

  return { deleted: ids.length, classes: targets };
}

/* --------------------------------- Mutasi ------------------------------- */

export async function createStudent(input: {
  fullName: string;
  studentNumber?: string;
  noInduk?: string;
  className?: string;
  gender?: "male" | "female";
  religion?: string;
  status: Student["status"];
  academicYear: string;
}): Promise<Student> {
  const { schoolId } = await requireSchoolUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      school_id: schoolId,
      full_name: input.fullName.trim(),
      student_number: input.studentNumber?.trim() || null,
      no_induk: input.noInduk?.trim() || null,
      class_name: input.className?.trim() || null,
      gender: input.gender ?? null,
      religion: input.religion?.trim() || null,
      status: input.status,
      academic_year: input.academicYear,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Student;
}

export async function updateStudent(
  id: string,
  input: {
    fullName: string;
    studentNumber?: string;
    noInduk?: string;
    className?: string;
    gender?: "male" | "female";
    religion?: string;
    status: Student["status"];
    academicYear: string;
  }
): Promise<Student> {
  const { schoolId } = await requireSchoolUser();
  const existing = await getOwnedStudent(id, schoolId);
  if (!existing) throw new Error("Data siswa tidak ditemukan");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update({
      full_name: input.fullName.trim(),
      student_number: input.studentNumber?.trim() || null,
      no_induk: input.noInduk?.trim() || null,
      class_name: input.className?.trim() || null,
      gender: input.gender ?? null,
      religion: input.religion?.trim() || null,
      status: input.status,
      academic_year: input.academicYear,
    })
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const { schoolId } = await requireSchoolUser();
  const existing = await getOwnedStudent(id, schoolId);
  if (!existing) throw new Error("Data siswa tidak ditemukan");

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);
}

function dedupeKey(r: { student_number: string | null; full_name: string; class_name: string | null }): string {
  if (r.student_number) return `nis:${r.student_number.toLowerCase()}`;
  return `nama:${r.full_name.toLowerCase()}|${(r.class_name ?? "").toLowerCase()}`;
}

/**
 * Import banyak siswa sekaligus. Baris yang sudah ada (NIS sama, atau
 * nama+kelas sama dalam tahun ajaran & sekolah yang sama) dilewati dan
 * dilaporkan — tidak diduplikasi, tidak menimpa data lama.
 */
export async function importStudents(
  rows: {
    full_name: string;
    student_number: string | null;
    no_induk: string | null;
    class_name: string | null;
    gender: "male" | "female" | null;
    religion: string | null;
    status: Student["status"];
  }[],
  academicYear: string
): Promise<ImportOutcome> {
  const { schoolId } = await requireSchoolUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("students")
    .select("full_name, student_number, class_name, academic_year")
    .eq("school_id", schoolId);
  const seen = new Set(
    ((existing ?? []) as Pick<Student, "full_name" | "student_number" | "class_name" | "academic_year">[])
      .filter((r) => normYear(r) === academicYear)
      .map((r) =>
        dedupeKey({
          student_number: r.student_number,
          full_name: r.full_name,
          class_name: r.class_name,
        })
      )
  );

  let inserted = 0;
  let skipped = 0;
  const failed: { name: string; message: string }[] = [];
  const batch: Database["public"]["Tables"]["students"]["Insert"][] = [];

  for (const row of rows) {
    const key = dedupeKey(row);
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    batch.push({
      school_id: schoolId,
      full_name: row.full_name.trim(),
      student_number: row.student_number?.trim() || null,
      no_induk: row.no_induk?.trim() || null,
      class_name: row.class_name?.trim() || null,
      gender: row.gender,
      religion: row.religion?.trim() || null,
      status: row.status,
      academic_year: academicYear,
    });
    if (batch.length >= 100) {
      const chunk = batch.splice(0);
      const { error } = await supabase.from("students").insert(chunk);
      if (error) {
        failed.push({ name: `${chunk.length} baris`, message: error.message });
      } else {
        inserted += chunk.length;
      }
    }
  }
  if (batch.length > 0) {
    const n = batch.length;
    const { error } = await supabase.from("students").insert(batch);
    if (error) {
      failed.push({ name: `${n} baris`, message: error.message });
    } else {
      inserted += n;
    }
  }

  return { inserted, skipped, failed };
}
