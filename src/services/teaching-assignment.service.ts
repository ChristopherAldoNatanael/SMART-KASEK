"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import type { Database } from "@/types/database";

type Assignment = Database["public"]["Tables"]["teaching_assignments"]["Row"];

export type MyAssignment = Pick<
  Assignment,
  "id" | "class_name" | "subject" | "academic_year"
>;

async function requireTeacherOwner(): Promise<{
  schoolId: string;
  teacherId: string;
}> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "teacher" && user.role !== "principal" && user.role !== "admin") {
    throw new Error("Anda tidak memiliki akses");
  }
  // Kepala Sekolah/Admin tidak punya baris guru sendiri — daftarnya
  // dikelola lewat halaman guru; di sini khusus pemilik.
  if (user.role !== "teacher") {
    throw new Error("Halaman ini untuk akun guru");
  }
  const teacherId = await getOwnTeacherId(user.id, user.schoolId);
  if (!teacherId) throw new Error("Akun Anda belum terhubung ke data guru");
  return { schoolId: user.schoolId, teacherId };
}

export type TeacherClassAccess =
  | {
      homeroom: string | null;
      assignedByYear: Record<string, string[]>;
    }
  | null;

/**
 * Ruang lingkup kelas untuk akun guru: kelas yang diwali + kelas yang
 * diajar per tahun ajaran. Null = akses penuh (Kepala Sekolah/Admin).
 * Dipakai halaman Data Siswa, Absensi, dan Rekap agar guru hanya
 * melihat kelasnya sendiri.
 */
export async function getTeacherClassAccess(): Promise<TeacherClassAccess> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "teacher") return null;

  const supabase = await createClient();
  const teacherId = await getOwnTeacherId(user.id, user.schoolId);
  if (!teacherId) return { homeroom: null, assignedByYear: {} };

  const [{ data: teacher }, { data: rows }] = await Promise.all([
    supabase
      .from("teachers")
      .select("homeroom_class")
      .eq("id", teacherId)
      .eq("school_id", user.schoolId)
      .single(),
    supabase
      .from("teaching_assignments")
      .select("class_name, academic_year")
      .eq("school_id", user.schoolId)
      .eq("teacher_id", teacherId),
  ]);

  const assignedByYear: Record<string, string[]> = {};
  for (const r of (rows ?? []) as { class_name: string; academic_year: string }[]) {
    const list = assignedByYear[r.academic_year] ?? [];
    if (!list.includes(r.class_name)) list.push(r.class_name);
    assignedByYear[r.academic_year] = list;
  }

  const homeroom =
    (teacher as { homeroom_class?: string | null } | null)?.homeroom_class?.trim() ||
    null;
  return { homeroom, assignedByYear };
}

/** Daftar "kelas yang saya ajar" milik guru yang login. */
export async function getMyAssignments(): Promise<MyAssignment[]> {
  const { schoolId, teacherId } = await requireTeacherOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teaching_assignments")
    .select("id, class_name, subject, academic_year")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("academic_year", { ascending: false })
    .order("class_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MyAssignment[];
}

/**
 * Simpan daftar kelas yang diajar (ganti total per tahun ajaran).
 * Duplikat (kelas+mapel sama) otomatis digabung.
 */
export async function saveMyAssignments(
  items: { className: string; subject: string }[],
  academicYear: string
): Promise<{ saved: number }> {
  const { schoolId, teacherId } = await requireTeacherOwner();
  const clean = new Map<string, { className: string; subject: string }>();
  for (const item of items.slice(0, 30)) {
    const cls = item.className.trim().slice(0, 50);
    const subject = item.subject.trim().slice(0, 100);
    if (!cls || !subject) continue;
    clean.set(`${cls.toLowerCase()}|${subject.toLowerCase()}`, {
      className: cls,
      subject,
    });
  }
  if (clean.size === 0) throw new Error("Isi minimal 1 kelas dan 1 mapel");

  const supabase = await createClient();
  const { error: delError } = await supabase
    .from("teaching_assignments")
    .delete()
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("academic_year", academicYear);
  if (delError) throw new Error(delError.message);

  const { error: insError } = await supabase
    .from("teaching_assignments")
    .insert(
      Array.from(clean.values()).map((r) => ({
        school_id: schoolId,
        teacher_id: teacherId,
        class_name: r.className,
        subject: r.subject,
        academic_year: academicYear,
      }))
    );
  if (insError) throw new Error(insError.message);
  return { saved: clean.size };
}
