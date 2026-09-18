"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Database } from "@/types/database";

type SchoolClass = Database["public"]["Tables"]["school_classes"]["Row"];

export type SchoolClassWithUsage = SchoolClass & { usedIn: number };

async function requireClassManager(): Promise<{ schoolId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat mengatur daftar kelas");
  }
  return { schoolId: user.schoolId };
}

async function getOwnedClass(id: string, schoolId: string): Promise<SchoolClass> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_classes")
    .select("*")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();
  if (error || !data) throw new Error("Kelas tidak ditemukan");
  return data as SchoolClass;
}

function sortClasses<T extends { name: string }>(rows: T[]): T[] {
  return rows.sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/** Daftar kelas se-sekolah (boleh dibaca semua peran untuk dropdown). */
export async function getSchoolClasses(): Promise<SchoolClass[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_classes")
    .select("*")
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);
  return sortClasses((data ?? []) as SchoolClass[]);
}

/** Nama kelas aktif untuk dropdown/saran. */
export async function getActiveSchoolClassNames(): Promise<string[]> {
  return (await getSchoolClasses())
    .filter((c) => c.is_active)
    .map((c) => c.name);
}

/** Daftar kelas + jumlah pemakaian (siswa + wali + daftar ajar). */
export async function getSchoolClassesWithUsage(): Promise<SchoolClassWithUsage[]> {
  const { schoolId } = await requireClassManager();
  const supabase = await createClient();
  const [{ data: classes }, { data: students }, { data: teachers }, { data: assigns }] =
    await Promise.all([
      supabase.from("school_classes").select("*").eq("school_id", schoolId),
      supabase.from("students").select("class_name").eq("school_id", schoolId),
      supabase.from("teachers").select("homeroom_class").eq("school_id", schoolId),
      supabase.from("teaching_assignments").select("class_name").eq("school_id", schoolId),
    ]);
  const useCount = new Map<string, number>();
  const bump = (name: string | null) => {
    const key = (name ?? "").trim().toLowerCase();
    if (!key) return;
    useCount.set(key, (useCount.get(key) ?? 0) + 1);
  };
  for (const r of (students ?? []) as { class_name: string | null }[]) bump(r.class_name);
  for (const r of (teachers ?? []) as { homeroom_class: string | null }[]) bump(r.homeroom_class);
  for (const r of (assigns ?? []) as { class_name: string }[]) bump(r.class_name);

  return sortClasses(((classes ?? []) as SchoolClass[]).map((c) => ({
    ...c,
    usedIn: useCount.get(c.name.trim().toLowerCase()) ?? 0,
  })));
}

export async function createSchoolClass(name: string): Promise<SchoolClass> {
  const { schoolId } = await requireClassManager();
  const clean = name.trim().slice(0, 50);
  if (!clean) throw new Error("Nama kelas tidak boleh kosong");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("school_classes")
    .select("name")
    .eq("school_id", schoolId);
  if (
    ((existing ?? []) as { name: string }[]).some(
      (r) => r.name.trim().toLowerCase() === clean.toLowerCase()
    )
  ) {
    throw new Error(`Kelas ${clean} sudah ada di daftar`);
  }

  const { data, error } = await supabase
    .from("school_classes")
    .insert({ school_id: schoolId, name: clean })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SchoolClass;
}

export async function renameSchoolClass(id: string, name: string): Promise<SchoolClass> {
  const { schoolId } = await requireClassManager();
  const clean = name.trim().slice(0, 50);
  if (!clean) throw new Error("Nama kelas tidak boleh kosong");
  const owned = await getOwnedClass(id, schoolId);
  if (owned.name === clean) return owned;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("school_classes")
    .select("id, name")
    .eq("school_id", schoolId);
  if (
    ((existing ?? []) as { id: string; name: string }[]).some(
      (r) => r.id !== id && r.name.trim().toLowerCase() === clean.toLowerCase()
    )
  ) {
    throw new Error(`Kelas ${clean} sudah ada di daftar`);
  }

  // Nama master hanya acuan dropdown — data lama (siswa/wali/daftar ajar)
  // yang memakai nama lama tetap tersimpan apa adanya.
  const { data, error } = await supabase
    .from("school_classes")
    .update({ name: clean })
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SchoolClass;
}

export async function setSchoolClassActive(id: string, active: boolean): Promise<void> {
  const { schoolId } = await requireClassManager();
  await getOwnedClass(id, schoolId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("school_classes")
    .update({ is_active: active })
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);
}

export async function deleteSchoolClass(id: string): Promise<void> {
  const { schoolId } = await requireClassManager();
  const owned = await getOwnedClass(id, schoolId);
  const withUsage = await getSchoolClassesWithUsage();
  const used = withUsage.find((c) => c.id === id)?.usedIn ?? 0;
  if (used > 0) {
    throw new Error(
      `Kelas ${owned.name} masih dipakai di ${used} data (siswa/wali/daftar ajar). Nonaktifkan saja bila tidak dipakai.`
    );
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("school_classes")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);
}
