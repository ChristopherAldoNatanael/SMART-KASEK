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
    employeeNumber?: string;
    nip?: string;
    subject?: string;
    department?: string;
    educationLevel?: string;
    employmentStatus?: string;
    joinedAt?: string;
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
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.educationLevel !== undefined)
    updateData.education_level = input.educationLevel;
  if (input.employmentStatus !== undefined)
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

export async function deleteTeacher(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const teacher = await getTeacherById(id);
  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  if (teacher.profile_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(
      teacher.profile_id as unknown as string
    );
    if (authError) {
      throw new Error(`Gagal hapus akun: ${authError.message}`);
    }
  }

  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) {
    throw new Error(error.message);
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
