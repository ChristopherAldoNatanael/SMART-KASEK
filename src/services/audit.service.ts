"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface AuditLogEntry {
  id: string;
  school_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

/**
 * Log an audit event.
 */
export async function logAuditEvent(input: {
  action: string;
  entity: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const supabase = await createClient();

    await supabase.from("audit_logs").insert({
      school_id: user.schoolId,
      user_id: user.id,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId || null,
      old_data: input.oldData || null,
      new_data: input.newData || null,
      ip_address: input.ipAddress || null,
    });
  } catch {
    // Audit logging should not break the application
    console.error("Failed to log audit event");
  }
}

/**
 * Get audit logs for the current user's school.
 */
export async function getAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      `
      *,
      user:profiles(full_name, email)
    `
    )
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data as AuditLogEntry[];
}

/**
 * Get audit log statistics.
 */
export async function getAuditStats(): Promise<{
  totalActions: number;
  todayActions: number;
  entityCounts: Record<string, number>;
}> {
  const user = await getCurrentUser();
  if (!user?.schoolId) {
    return { totalActions: 0, todayActions: 0, entityCounts: {} };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("entity, created_at")
    .eq("school_id", user.schoolId);

  if (error) {
    return { totalActions: 0, todayActions: 0, entityCounts: {} };
  }

  const today = new Date().toISOString().split("T")[0];
  const entityCounts: Record<string, number> = {};
  let todayActions = 0;

  for (const log of data) {
    entityCounts[log.entity] = (entityCounts[log.entity] || 0) + 1;
    if (log.created_at?.startsWith(today)) {
      todayActions++;
    }
  }

  return {
    totalActions: data.length,
    todayActions,
    entityCounts,
  };
}
