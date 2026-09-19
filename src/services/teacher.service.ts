"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Database } from "@/types/database";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];
type TeacherInsert = Database["public"]["Tables"]["teachers"]["Insert"];
type TeacherUpdate = Database["public"]["Tables"]["teachers"]["Update"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type TeacherWithProfile = Teacher & {
  profile: Pick<Profile, "full_name" | "email" | "avatar_url" | "is_active"> | null;
};

async function isOwnTeacher(
  profileId: string,
  schoolId: string,
  teacherId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .single();
  return !!data;
}

/**
 * Resolve the teachers-row id for a profile (shared helper).
 * Null when the account isn't linked to teacher data.
 */
export async function getOwnTeacherId(
  profileId: string,
  schoolId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .single();
  return data?.id ?? null;
}

/**
 * Baris teachers milik user saat ini (untuk "Profil Saya").
 * Null bila akun belum terhubung ke data guru.
 */
export async function getMyTeacher(): Promise<TeacherWithProfile | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select(
      `
      *,
      profile:profiles(full_name, email, avatar_url, is_active)
    `
    )
    .eq("profile_id", user.id)
    .eq("school_id", user.schoolId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data as TeacherWithProfile;
}

export async function getTeachers(): Promise<TeacherWithProfile[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select(
      `
      *,
      profile:profiles(full_name, email, avatar_url, is_active)
    `
    )
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as TeacherWithProfile[];
}

export async function getTeacherById(
  id: string
): Promise<TeacherWithProfile | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  // Guru hanya boleh membuka profilnya sendiri (detail by URL).
  if (
    user.role === "teacher" &&
    !(await isOwnTeacher(user.id, user.schoolId, id))
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select(
      `
      *,
      profile:profiles(full_name, email, avatar_url, is_active)
    `
    )
    .eq("id", id)
    .eq("school_id", user.schoolId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data as TeacherWithProfile;
}

export async function createTeacher(input: {
  fullName: string;
  email: string;
  employeeNumber?: string;
  nip?: string;
  subject?: string;
  department?: string;
  educationLevel?: string;
  employmentStatus?: string;
  joinedAt?: string;
}): Promise<Teacher> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: generateTempPassword(),
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
    },
  });

  if (authError) {
    throw new Error(`Gagal membuat akun: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("Gagal membuat akun user");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    auth_user_id: authData.user.id,
    school_id: user.schoolId,
    full_name: input.fullName,
    email: input.email,
    role: "teacher",
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Gagal membuat profil: ${profileError.message}`);
  }

  const teacherData: TeacherInsert = {
    profile_id: authData.user.id as unknown as string,
    school_id: user.schoolId!,
    employee_number: input.employeeNumber || null,
    nip: input.nip || null,
    subject: input.subject || null,
    department: input.department || null,
    education_level: input.educationLevel || null,
    employment_status: input.employmentStatus || "active",
    joined_at: input.joinedAt || null,
  };

  const { data, error } = await supabase
    .from("teachers")
    .insert(teacherData)
    .select()
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(error.message);
  }

  return data;
}

export async function updateTeacher(
  id: string,
  input: {
    fullName?: string;
    employeeNumber?: string | null;
    nip?: string | null;
    subject?: string | null;
    homeroomClass?: string | null;
    department?: string | null;
    educationLevel?: string | null;
    employmentStatus?: string | null;
    joinedAt?: string | null;
  }
): Promise<Teacher> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const teacher = await getTeacherById(id);
  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  const updateData: TeacherUpdate = {};
  if (input.employeeNumber !== undefined)
    updateData.employee_number = input.employeeNumber;
  if (input.nip !== undefined) updateData.nip = input.nip;
  if (input.subject !== undefined)
    updateData.subject = input.subject || null;
  if (input.homeroomClass !== undefined)
    updateData.homeroom_class = input.homeroomClass || null;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.educationLevel !== undefined)
    updateData.education_level = input.educationLevel;
  if (input.employmentStatus)
    updateData.employment_status = input.employmentStatus;
  if (input.joinedAt !== undefined) updateData.joined_at = input.joinedAt;

  const { data, error } = await supabase
    .from("teachers")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", user.schoolId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (input.fullName) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: input.fullName })
      .eq("id", teacher.profile_id);

    if (profileError) {
      throw new Error(`Gagal update profil: ${profileError.message}`);
    }
  }

  return data;
}

/**
 * Activate/deactivate a teacher's login profile (principal only via caller).
 * Reversible alternative to hard delete: deleted auth users cannot be
 * removed without the service-role key, while deactivation keeps history
 * (supervision, coaching, growth) intact.
 */
export async function setTeacherActive(
  id: string,
  isActive: boolean
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const teacher = await getTeacherById(id);
  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }
  if (!teacher.profile_id) {
    throw new Error("Profil guru tidak ditemukan");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", teacher.profile_id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Hapus guru dari sekolah (principal/admin, se-sekolah sendiri).
 * - Akun sendiri tidak bisa dihapus.
 * - Baris guru dihapus dulu (CASCADE: supervisi, coaching, nilai,
 *   growth, modul/jurnal/asesmen, daftar ajar), lalu profilnya
 *   (referensi penilai dinullkan via SET NULL).
 * - Akun login (auth) sengaja TIDAK dihapus: project ini tanpa
 *   service-role key sehingga auth.admin tak bisa dipakai. Bekas
 *   guru yang login lagi diarahkan ke onboarding (belum terhubung
 *   ke sekolah). Untuk nonaktif sementara, pakai setTeacherActive.
 */
export async function deleteTeacher(id: string): Promise<{ fullName: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat menghapus data guru");
  }

  const teacher = await getTeacherById(id);
  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }
  if (teacher.profile_id && teacher.profile_id === user.id) {
    throw new Error("Akun sendiri tidak dapat dihapus");
  }

  const supabase = await createClient();
  const fullName = teacher.profile?.full_name ?? "Guru";

  const { error: teacherError } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId);
  if (teacherError) {
    throw new Error(teacherError.message);
  }

  if (teacher.profile_id) {
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", teacher.profile_id);
    if (profileError) {
      throw new Error(profileError.message);
    }
  }

  return { fullName };
}

/**
 * Tetapkan wali kelas. Satu kelas satu wali — pemegang lama kelas yang
 * sama otomatis dikosongkan. Khusus Kepala Sekolah (ditambah RLS).
 */
export async function assignHomeroom(
  teacherId: string | null,
  className: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat mengatur wali kelas");
  }
  const target = className.trim();
  if (!target) throw new Error("Nama kelas tidak valid");

  const supabase = await createClient();

  if (teacherId) {
    const teacher = await getTeacherById(teacherId);
    if (!teacher) throw new Error("Guru tidak ditemukan");
  }

  // Kosongkan dulu semua pemegang kelas ini (tetap dalam sekolah sendiri).
  const { error: clearError } = await supabase
    .from("teachers")
    .update({ homeroom_class: null })
    .eq("school_id", user.schoolId)
    .eq("homeroom_class", target);
  if (clearError) throw new Error(clearError.message);

  if (teacherId) {
    await updateTeacher(teacherId, { homeroomClass: target });
  }
}

function generateTempPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
