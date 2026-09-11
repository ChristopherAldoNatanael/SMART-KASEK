"use server";

import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/schemas/onboarding";
import type { Database } from "@/types/database";

type School = Database["public"]["Tables"]["schools"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SchoolWithInvite = School & { invite_code?: string | null };

/**
 * Discriminated onboarding states (§dashboard states A–E):
 * - no_profile: auth user has no profiles row yet
 * - needs_school: profile exists but school_id is NULL
 * - ready: profile + school resolved
 * - error: technical failure (NEVER reported as "not connected")
 */
export type OnboardingState =
  | { status: "no_profile" }
  | { status: "needs_school"; role: Profile["role"]; fullName: string }
  | { status: "ready"; school: School; role: Profile["role"] }
  | { status: "error"; message: string };

async function getOwnProfile(): Promise<{
  profile: Profile | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { profile: null, error: "NOT_AUTHENTICATED" };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return { profile: null, error: null };
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (error) {
    return {
      profile: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const { profile, error } = await getOwnProfile();

  if (error) {
    if (error === "NOT_AUTHENTICATED") {
      return { status: "error", message: "Sesi berakhir. Silakan login kembali." };
    }
    return { status: "error", message: "Gagal memuat data sekolah" };
  }

  if (!profile) return { status: "no_profile" };
  if (!profile.school_id) {
    return {
      status: "needs_school",
      role: profile.role,
      fullName: profile.full_name,
    };
  }

  try {
    const supabase = await createClient();
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("*")
      .eq("id", profile.school_id)
      .single();

    if (schoolError || !school) {
      return {
        status: "error",
        message: "Data sekolah tidak ditemukan. Hubungi Kepala Sekolah Anda.",
      };
    }
    return { status: "ready", school, role: profile.role };
  } catch {
    return { status: "error", message: "Gagal memuat data sekolah" };
  }
}

/** Current user's school (null when not linked; throws on technical error). */
export async function getMySchool(): Promise<School | null> {
  const supabase = await createClient();
  const { profile, error } = await getOwnProfile();
  if (error) throw new Error("Gagal memuat data sekolah");
  if (!profile?.school_id) return null;

  const { data, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .single();

  if (schoolError) throw new Error("Gagal memuat data sekolah");
  return data;
}

/** School's invite code — visible to the principal of that school. */
export async function getMySchoolInviteCode(): Promise<string | null> {
  try {
    const { profile, error } = await getOwnProfile();
    if (error || !profile?.school_id) return null;
    if (profile.role !== "principal" && profile.role !== "admin") return null;

    const supabase = await createClient();
    const { data, error: codeError } = await supabase
      .from("schools")
      .select("invite_code")
      .eq("id", profile.school_id)
      .single();

    // Null when migration 00003 (invite_code) isn't applied yet.
    if (codeError) return null;
    return (data?.invite_code as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function ensureProfile(
  role: "principal" | "teacher"
): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_profile", {
    p_role: role,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data as Profile;
}

export async function createSchool(input: {
  name: string;
  npsn?: string;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<SchoolWithInvite> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_school", {
    p_name: input.name,
    p_npsn: input.npsn ?? null,
    p_address: input.address ?? null,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data as SchoolWithInvite;
}

export async function joinSchool(input: {
  code: string;
  subject?: string;
  homeroomClass?: string;
  nip?: string;
}): Promise<SchoolWithInvite> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_school", {
    p_code: input.code,
    p_subject: input.subject || null,
    p_homeroom_class: input.homeroomClass || null,
    p_nip: input.nip || null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data as SchoolWithInvite;
}

/**
 * Update the current user's school (principal only, enforced in RPC).
 * Logo fields are set via uploadSchoolLogo; passing logoUrl updates the URL.
 */
export async function updateSchool(input: {
  name: string;
  npsn?: string;
  address?: string;
  village?: string;
  district?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  principalNip?: string;
  logoUrl?: string | null;
  logoSize?: number;
}): Promise<SchoolWithInvite> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_school", {
    p_name: input.name,
    p_npsn: input.npsn ?? null,
    p_address: input.address ?? null,
    p_village: input.village ?? null,
    p_district: input.district ?? null,
    p_city: input.city ?? null,
    p_province: input.province ?? null,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_principal_name: input.principalName ?? null,
    p_principal_nip: input.principalNip ?? null,
    p_logo_url: input.logoUrl ?? null,
    p_logo_size: input.logoSize ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data as SchoolWithInvite;
}

function logoExtension(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "png";
}

/**
 * Upload a school logo to Storage and point the school record at it.
 * Storage RLS restricts writes to the principal of that school.
 */
export async function uploadSchoolLogo(file: File): Promise<string> {
  const supabase = await createClient();
  const { profile, error: profileError } = await getOwnProfile();
  if (profileError || !profile?.school_id) {
    throw new Error("Akun Anda belum terhubung ke sekolah.");
  }
  if (profile.role !== "principal" && profile.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat mengganti logo.");
  }

  const path = `${profile.school_id}/logo-${Date.now()}.${logoExtension(file.type)}`;
  const { error: uploadError } = await supabase.storage
    .from("school-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(rpcErrorMessage(uploadError));

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/school-logos/${path}`;
}
