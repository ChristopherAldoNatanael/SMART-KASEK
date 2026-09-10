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

    // Try to get profile from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, school_id, is_active")
      .eq("auth_user_id", user.id)
      .single();

    // If profile exists and is active, return it
    if (profile && profile.is_active) {
      return {
        id: profile.id,
        email: user.email ?? "",
        role: profile.role,
        schoolId: profile.school_id,
        fullName: profile.full_name,
        isActive: profile.is_active,
      };
    }

    // If no profile, try to create one (may fail due to RLS - that's OK)
    if (!profile) {
      try {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            auth_user_id: user.id,
            full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
            email: user.email ?? "",
            role: "teacher" as UserRole,
            is_active: true,
          })
          .select("id, full_name, role, school_id, is_active")
          .single();

        if (newProfile) {
          return {
            id: newProfile.id,
            email: user.email ?? "",
            role: newProfile.role,
            schoolId: newProfile.school_id,
            fullName: newProfile.full_name,
            isActive: newProfile.is_active,
          };
        }
      } catch {
        // Profile creation failed (RLS or other error) - use fallback
      }
    }

    // Fallback: return user data from Auth
    return {
      id: user.id,
      email: user.email ?? "",
      role: "teacher",
      schoolId: null,
      fullName: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
      isActive: true,
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
