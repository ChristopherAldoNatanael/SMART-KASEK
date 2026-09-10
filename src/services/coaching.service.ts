"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { requirePrincipal } from "@/lib/permissions";
import type { Database } from "@/types/database";

type CoachingSession = Database["public"]["Tables"]["coaching_sessions"]["Row"];
type CoachingSessionInsert =
  Database["public"]["Tables"]["coaching_sessions"]["Insert"];
type CoachingSessionUpdate =
  Database["public"]["Tables"]["coaching_sessions"]["Update"];
type CoachingAction = Database["public"]["Tables"]["coaching_actions"]["Row"];
type CoachingActionInsert =
  Database["public"]["Tables"]["coaching_actions"]["Insert"];
type CoachingActionUpdate =
  Database["public"]["Tables"]["coaching_actions"]["Update"];

export type CoachingSessionWithDetails = CoachingSession & {
  teacher: { id: string; profile: { full_name: string | null } | null } | null;
  coach: { id: string; full_name: string | null } | null;
  supervision: { id: string; supervision_date: string } | null;
  actions: CoachingAction[];
};

/**
 * Get all coaching sessions for the current user's school.
 */
export async function getCoachingSessions(): Promise<
  CoachingSessionWithDetails[]
> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coaching_sessions")
    .select(
      `
      *,
      teacher:teachers(id, profile:profiles(full_name)),
      coach:profiles(full_name),
      supervision:supervisions(id, supervision_date),
      actions:coaching_actions(*)
    `
    )
    .eq("school_id", user.schoolId)
    .order("session_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as CoachingSessionWithDetails[];
}

/**
 * Get a single coaching session by ID with all details.
 */
export async function getCoachingSessionById(
  id: string
): Promise<CoachingSessionWithDetails | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coaching_sessions")
    .select(
      `
      *,
      teacher:teachers(id, profile:profiles(full_name)),
      coach:profiles(full_name),
      supervision:supervisions(id, supervision_date),
      actions:coaching_actions(*)
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

  return data as CoachingSessionWithDetails;
}

/**
 * Get coaching sessions for a specific teacher.
 */
export async function getTeacherCoachingSessions(
  teacherId: string
): Promise<CoachingSession[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Verify teacher belongs to user's school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  const { data, error } = await supabase
    .from("coaching_sessions")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("session_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Create a new coaching session.
 */
export async function createCoachingSession(input: {
  teacherId: string;
  sessionDate: string;
  focusArea?: string;
  initialCondition?: string;
  discussion?: string;
  agreement?: string;
  summary?: string;
  status?: string;
  supervisionId?: string;
  actions?: {
    action: string;
    targetDate?: string;
  }[];
}): Promise<CoachingSession> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Verify teacher belongs to user's school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", input.teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) {
    throw new Error("Guru tidak ditemukan");
  }

  const sessionData: CoachingSessionInsert = {
    school_id: user.schoolId,
    teacher_id: input.teacherId,
    coach_id: user.id,
    supervision_id: input.supervisionId || null,
    session_date: input.sessionDate,
    focus_area: input.focusArea || null,
    initial_condition: input.initialCondition || null,
    discussion: input.discussion || null,
    agreement: input.agreement || null,
    summary: input.summary || null,
    status: input.status || "scheduled",
  };

  const { data, error } = await supabase
    .from("coaching_sessions")
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Insert coaching actions if provided
  if (input.actions && input.actions.length > 0) {
    const actionsData: CoachingActionInsert[] = input.actions.map((action) => ({
      coaching_session_id: data.id,
      action: action.action,
      target_date: action.targetDate || null,
      status: "pending",
    }));

    const { error: actionsError } = await supabase
      .from("coaching_actions")
      .insert(actionsData);

    if (actionsError) {
      throw new Error(`Gagal menambahkan tindakan: ${actionsError.message}`);
    }
  }

  return data;
}

/**
 * Update a coaching session.
 */
export async function updateCoachingSession(
  id: string,
  input: {
    sessionDate?: string;
    focusArea?: string;
    initialCondition?: string;
    discussion?: string;
    agreement?: string;
    summary?: string;
    status?: string;
  }
): Promise<CoachingSession> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const session = await getCoachingSessionById(id);
  if (!session) {
    throw new Error("Sesi coaching tidak ditemukan");
  }

  const updateData: CoachingSessionUpdate = {};
  if (input.sessionDate !== undefined) updateData.session_date = input.sessionDate;
  if (input.focusArea !== undefined) updateData.focus_area = input.focusArea;
  if (input.initialCondition !== undefined)
    updateData.initial_condition = input.initialCondition;
  if (input.discussion !== undefined) updateData.discussion = input.discussion;
  if (input.agreement !== undefined) updateData.agreement = input.agreement;
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from("coaching_sessions")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", user.schoolId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a coaching session.
 * Requires principal role (legacy admin accepted for compatibility).
 */
export async function deleteCoachingSession(id: string): Promise<void> {
  const user = await requirePrincipal();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const session = await getCoachingSessionById(id);
  if (!session) {
    throw new Error("Sesi coaching tidak ditemukan");
  }

  const { error } = await supabase
    .from("coaching_sessions")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Add a coaching action to a session.
 */
export async function addCoachingAction(input: {
  sessionId: string;
  action: string;
  targetDate?: string;
}): Promise<CoachingAction> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Verify session belongs to user's school
  const { data: session } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("id", input.sessionId)
    .eq("school_id", user.schoolId)
    .single();

  if (!session) {
    throw new Error("Sesi coaching tidak ditemukan");
  }

  const actionData: CoachingActionInsert = {
    coaching_session_id: input.sessionId,
    action: input.action,
    target_date: input.targetDate || null,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("coaching_actions")
    .insert(actionData)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a coaching action.
 */
export async function updateCoachingAction(
  id: string,
  input: {
    action?: string;
    targetDate?: string;
    completedDate?: string;
    status?: Database["public"]["Tables"]["coaching_actions"]["Row"]["status"];
    evidence?: string;
    result?: string;
    notes?: string;
  }
): Promise<CoachingAction> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Verify the action belongs to a session in the user's school.
  const { data: existing } = await supabase
    .from("coaching_actions")
    .select("id, session:coaching_sessions!inner(school_id)")
    .eq("id", id)
    .single();

  if (!existing) {
    throw new Error("Tindak lanjut tidak ditemukan");
  }

  const session = existing.session as unknown as {
    school_id: string;
  } | null;
  if (!session || session.school_id !== user.schoolId) {
    throw new Error("Tindak lanjut tidak ditemukan");
  }

  const updateData: CoachingActionUpdate = {};
  if (input.action !== undefined) updateData.action = input.action;
  if (input.targetDate !== undefined) updateData.target_date = input.targetDate;
  if (input.completedDate !== undefined)
    updateData.completed_date = input.completedDate;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.evidence !== undefined) updateData.evidence = input.evidence;
  if (input.result !== undefined) updateData.result = input.result;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from("coaching_actions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get coaching statistics for the school.
 */
export async function getCoachingStats(): Promise<{
  totalSessions: number;
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  overdueActions: number;
}> {
  const user = await getCurrentUser();
  if (!user?.schoolId) {
    return {
      totalSessions: 0,
      totalActions: 0,
      pendingActions: 0,
      completedActions: 0,
      overdueActions: 0,
    };
  }

  const supabase = await createClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("school_id", user.schoolId);

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const sessionIds = sessions?.map((s) => s.id) ?? [];

  if (sessionIds.length === 0) {
    return {
      totalSessions: sessions?.length ?? 0,
      totalActions: 0,
      pendingActions: 0,
      completedActions: 0,
      overdueActions: 0,
    };
  }

  const { data: actions, error: actionsError } = await supabase
    .from("coaching_actions")
    .select("status, target_date")
    .in("coaching_session_id", sessionIds);

  if (actionsError) {
    throw new Error(actionsError.message);
  }

  const today = new Date().toISOString().split("T")[0];
  const safeActions = actions ?? [];

  return {
    totalSessions: sessions?.length ?? 0,
    totalActions: safeActions.length,
    pendingActions: safeActions.filter(
      (a) => a.status === "pending" || a.status === "in_progress"
    ).length,
    completedActions: safeActions.filter((a) => a.status === "completed").length,
    overdueActions: safeActions.filter(
      (a) => a.status === "pending" && a.target_date && a.target_date < today
    ).length,
  };
}
