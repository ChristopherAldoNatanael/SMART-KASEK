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
      (r.student_number ?? "").toLowerCase().includes(q)
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

export type ImportOutcome = {
  inserted: number;
  skipped: number;
  failed: { name: string; message: string }[];
};

/* ------------------------------ Kenaikan kelas --------------------------- */

export type PromotePreview = {
  className: string | null;
  total: number;
  active: number;
}[];

/** Daftar kelas + jumlah siswa pada tahun asal (untuk panel kenaikan kelas). */
export async function getPromotePreview(sourceYear: string): Promise<PromotePreview> {
  const { schoolId } = await requireSchoolUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("class_name, status, academic_year")
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  const groups = new Map<string, { total: number; active: number }>();
  for (const r of (data ?? []) as Pick<Student, "class_name" | "status" | "academic_year">[]) {
    if (normYear(r) !== sourceYear) continue;
    const key = (r.class_name ?? "").trim();
    const g = groups.get(key) ?? { total: 0, active: 0 };
    g.total++;
    if (r.status === "active") g.active++;
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([key, g]) => ({ className: key || null, total: g.total, active: g.active }))
    .sort((a, b) => (a.className ?? "").localeCompare(b.className ?? "", "id"));
}

export type PromoteOutcome = {
  moved: number;
  graduated: number;
  skipped: number;
};

/**
 * Pindahkan siswa aktif tahun asal ke tahun tujuan sesuai peta kelas.
 * - graduate=true → tercatat di tahun tujuan dengan status Lulus.
 * - Baris yang sudah ada di tahun tujuan dilewati (aman dijalankan ulang).
 */
export async function promoteStudents(input: {
  sourceYear: string;
  targetYear: string;
  mappings: { fromClass: string | null; toClass: string | null; graduate: boolean }[];
}): Promise<PromoteOutcome> {
  const { schoolId } = await requireSchoolUser();
  if (input.sourceYear === input.targetYear) {
    throw new Error("Tahun asal dan tahun tujuan tidak boleh sama");
  }

  const usable = input.mappings.filter(
    (m) => m.graduate || (m.toClass ?? "").trim() !== ""
  );
  if (usable.length === 0) {
    throw new Error("Isi kelas tujuan minimal untuk 1 kelas, atau tandai lulus");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);
  const all = (data ?? []) as Student[];

  const byClass = new Map<string, Student[]>();
  for (const r of all) {
    if (normYear(r) !== input.sourceYear || r.status !== "active") continue;
    const key = (r.class_name ?? "").trim().toLowerCase();
    const list = byClass.get(key) ?? [];
    list.push(r);
    byClass.set(key, list);
  }

  const seen = new Set(
    all
      .filter((r) => normYear(r) === input.targetYear)
      .map((r) =>
        dedupeKey({
          student_number: r.student_number,
          full_name: r.full_name,
          class_name: r.class_name,
        })
      )
  );

  let moved = 0;
  let graduated = 0;
  let skipped = 0;
  const batch: Database["public"]["Tables"]["students"]["Insert"][] = [];

  async function flush(): Promise<void> {
    if (batch.length === 0) return;
    const chunk = batch.splice(0);
    const { error: insertError } = await supabase.from("students").insert(chunk);
    if (insertError) throw new Error(insertError.message);
  }

  for (const m of usable) {
    const students = byClass.get(((m.fromClass ?? "").trim()).toLowerCase()) ?? [];
    for (const s of students) {
      const next: Database["public"]["Tables"]["students"]["Insert"] = m.graduate
        ? {
            school_id: schoolId,
            full_name: s.full_name,
            student_number: s.student_number,
            class_name: s.class_name,
            gender: s.gender,
            status: "graduated",
            academic_year: input.targetYear,
          }
        : {
            school_id: schoolId,
            full_name: s.full_name,
            student_number: s.student_number,
            class_name: (m.toClass ?? "").trim() || null,
            gender: s.gender,
            status: "active",
            academic_year: input.targetYear,
          };
      const key = dedupeKey({
        student_number: next.student_number ?? null,
        full_name: next.full_name ?? "",
        class_name: next.class_name ?? null,
      });
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);
      batch.push(next);
      if (m.graduate) graduated++;
      else moved++;
      if (batch.length >= 100) await flush();
    }
  }
  await flush();

  return { moved, graduated, skipped };
}

/* --------------------------------- Mutasi ------------------------------- */

export async function createStudent(input: {
  fullName: string;
  studentNumber?: string;
  className?: string;
  gender?: "male" | "female";
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
      class_name: input.className?.trim() || null,
      gender: input.gender ?? null,
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
    className?: string;
    gender?: "male" | "female";
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
      class_name: input.className?.trim() || null,
      gender: input.gender ?? null,
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
    class_name: string | null;
    gender: "male" | "female" | null;
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
      class_name: row.class_name?.trim() || null,
      gender: row.gender,
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
