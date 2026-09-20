"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  fullName: string;
  isActive: boolean;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Profile is the source of truth for role, school, and active flag.
    // No auto-creation and no synthetic fallback: callers must handle
    // null explicitly (onboarding / login redirect).
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, school_id, is_active, avatar_url")
      .eq("auth_user_id", user.id)
      .single();

    // Only an existing, active profile yields a user.
    if (!profile || !profile.is_active) {
      return null;
    }

    return {
      id: profile.id,
      email: user.email ?? "",
      role: profile.role,
      schoolId: profile.school_id,
      fullName: profile.full_name,
      isActive: profile.is_active,
      avatarUrl: (profile.avatar_url as string | null) ?? null,
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
