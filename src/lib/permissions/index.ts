import { redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "@/lib/auth";
import type { UserRole } from "@/types/database";

// Re-export auth actions for convenience
export { login, logout, signup } from "@/lib/auth/actions";

/**
 * Role hierarchy for permission checking.
 * Higher number = more permissions.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  teacher: 1,
  principal: 2,
  admin: 3,
};

/**
 * Check if a user has at least the required role level.
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user belongs to a specific school.
 */
export function belongsToSchool(
  user: CurrentUser,
  schoolId: string
): boolean {
  if (user.role === "admin") {
    return true;
  }
  return user.schoolId === schoolId;
}

/**
 * Require authentication. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await requireUser();
  return user;
}

/**
 * Require a specific role. Redirects to dashboard if unauthorized.
 */
export async function requireRole(
  role: UserRole
): Promise<CurrentUser> {
  const user = await requireUser();

  if (!hasRole(user.role, role)) {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Require admin role.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("admin");
}

/**
 * Require principal role (or admin).
 */
export async function requirePrincipal(): Promise<CurrentUser> {
  return requireRole("principal");
}

/**
 * Require teacher role (or higher).
 */
export async function requireTeacher(): Promise<CurrentUser> {
  return requireRole("teacher");
}

/**
 * Verify user belongs to the specified school.
 * Admins can access any school.
 */
export async function requireSchoolAccess(
  schoolId: string
): Promise<CurrentUser> {
  const user = await requireUser();

  if (!belongsToSchool(user, schoolId)) {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Get the school ID for the current user.
 * Returns null for admin users (they can access all schools).
 */
export async function getUserSchoolId(): Promise<string | null> {
  const user = await requireUser();
  return user.schoolId;
}

/**
 * Check if user can manage teachers (principal or admin).
 */
export function canManageTeachers(user: CurrentUser): boolean {
  return hasRole(user.role, "principal");
}

/**
 * Check if user can view teacher data.
 * Teachers can view their own data, principals/admins can view all in their school.
 */
export function canViewTeacher(
  user: CurrentUser,
  teacherSchoolId: string
): boolean {
  if (user.role === "admin") {
    return true;
  }
  return user.schoolId === teacherSchoolId;
}

/**
 * Check if user can edit a teacher (principal or admin in same school).
 */
export function canEditTeacher(
  user: CurrentUser,
  teacherSchoolId: string
): boolean {
  if (user.role === "admin") {
    return true;
  }
  if (user.role === "principal" && user.schoolId === teacherSchoolId) {
    return true;
  }
  return false;
}

/**
 * Check if user can delete records (admin only).
 */
export function canDelete(user: CurrentUser): boolean {
  return user.role === "admin";
}
