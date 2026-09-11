"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  evaluateTeacherWarnings,
  warningTitle,
  type TeacherWarningSignals,
  type WarningFinding,
} from "@/lib/early-warning/rules";
import { buildWarningExplanationPrompt } from "@/lib/ai/prompts";
import { generateAIText } from "@/lib/ai/chain";
import {
  sanitizeAIOutput,
  validateAIOutputWithFallback,
  type ValidatedAIOutput,
} from "@/lib/ai/validators";
import type { Database } from "@/types/database";

type WarningRow = Database["public"]["Tables"]["early_warnings"]["Row"];

export type ActiveWarning = WarningRow & {
  teacherName: string | null;
};

export type ExplainResult = {
  success: boolean;
  data?: ValidatedAIOutput;
  error?: string;
};

/**
 * Run the deterministic rule engine over live school data.
 * Returns findings WITHOUT persisting — AI never decides severity (§17).
 */
export async function getRuleFindings(): Promise<WarningFinding[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [{ data: teachers }, { data: supervisions }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("teachers")
        .select("id, subject, profile:profiles(full_name)")
        .eq("school_id", user.schoolId),
      supabase
        .from("supervisions")
        .select("teacher_id, overall_score, supervision_date")
        .eq("school_id", user.schoolId)
        .order("supervision_date", { ascending: false }),
      supabase
        .from("coaching_sessions")
        .select("id, teacher_id, session_date")
        .eq("school_id", user.schoolId)
        .order("session_date", { ascending: false }),
    ]);

  if (!teachers || teachers.length === 0) return [];

  const teacherIds = teachers.map((t) => t.id);
  const sessionTeacher = new Map<string, string>();
  for (const s of sessions ?? []) sessionTeacher.set(s.id, s.teacher_id);

  const [{ data: actions }, { data: snapshots }] = await Promise.all([
    sessionTeacher.size > 0
      ? supabase
          .from("coaching_actions")
          .select("coaching_session_id, status, target_date")
          .in("coaching_session_id", Array.from(sessionTeacher.keys()))
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("teacher_growth_snapshots")
      .select("teacher_id, period, overall_score")
      .in("teacher_id", teacherIds)
      .order("period", { ascending: true }),
  ]);

  // Latest supervision score per teacher (rows already newest-first)
  const latestSupervision = new Map<string, number | null>();
  for (const s of supervisions ?? []) {
    if (!latestSupervision.has(s.teacher_id)) {
      latestSupervision.set(s.teacher_id, s.overall_score);
    }
  }

  // Latest coaching date per teacher
  const latestCoaching = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (!latestCoaching.has(s.teacher_id)) {
      latestCoaching.set(s.teacher_id, s.session_date);
    }
  }

  // Pending/overdue actions per teacher
  const pending = new Map<string, number>();
  const overdue = new Map<string, number>();
  for (const a of actions ?? []) {
    const teacherId = sessionTeacher.get(a.coaching_session_id);
    if (!teacherId) continue;
    if (a.status === "pending" || a.status === "in_progress") {
      pending.set(teacherId, (pending.get(teacherId) ?? 0) + 1);
      if (a.status === "pending" && a.target_date && a.target_date < todayStr) {
        overdue.set(teacherId, (overdue.get(teacherId) ?? 0) + 1);
      }
    }
  }

  // Growth latest + previous per teacher (rows oldest-first)
  const growth = new Map<string, (number | null)[]>();
  for (const snap of snapshots ?? []) {
    const list = growth.get(snap.teacher_id) ?? [];
    list.push(snap.overall_score);
    growth.set(snap.teacher_id, list);
  }

  const findings: WarningFinding[] = [];
  for (const t of teachers) {
    const scores = growth.get(t.id) ?? [];
    const latestGrowth = scores.length > 0 ? scores[scores.length - 1] : null;
    const previousGrowth = scores.length > 1 ? scores[scores.length - 2] : null;

    const lastCoachingDate = latestCoaching.get(t.id);
    const signals: TeacherWarningSignals = {
      teacherId: t.id,
      teacherName:
        (t.profile as unknown as { full_name: string | null } | null)
          ?.full_name ?? "Tanpa nama",
      subject: t.subject,
      latestGrowth,
      previousGrowth,
      latestSupervisionScore: latestSupervision.get(t.id) ?? null,
      daysSinceCoaching: lastCoachingDate
        ? Math.floor(
            (today.getTime() - new Date(lastCoachingDate).getTime()) / 86_400_000
          )
        : null,
      pendingActions: pending.get(t.id) ?? 0,
      overdueActions: overdue.get(t.id) ?? 0,
    };
    findings.push(...evaluateTeacherWarnings(signals));
  }

  return findings;
}

/**
 * Stored active warnings for the school.
 */
export async function getActiveWarnings(): Promise<ActiveWarning[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("early_warnings")
    .select("*, teacher:teachers(profile:profiles(full_name))")
    .eq("school_id", user.schoolId)
    .eq("status", "active")
    .order("detected_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((w) => {
    const teacher = w.teacher as unknown as {
      profile: { full_name: string | null } | null;
    } | null;
    return { ...w, teacherName: teacher?.profile?.full_name ?? null };
  });
}

/**
 * Persist a rule finding as a stored warning.
 * Deduplicates: an active warning of the same teacher+type is reused.
 */
export async function saveFindingAsWarning(
  finding: WarningFinding
): Promise<WarningRow> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  // Teacher must belong to the school
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", finding.teacherId)
    .eq("school_id", user.schoolId)
    .single();

  if (!teacher) throw new Error("Guru tidak ditemukan");

  const { data: existing } = await supabase
    .from("early_warnings")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", finding.teacherId)
    .eq("type", finding.type)
    .eq("status", "active")
    .limit(1)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("early_warnings")
    .insert({
      school_id: user.schoolId,
      teacher_id: finding.teacherId,
      type: finding.type,
      severity: finding.severity,
      title: `${warningTitle(finding.type)} — ${finding.teacherName}`,
      description: finding.evidence.join("; "),
      evidence: { evidence: finding.evidence } as unknown as object,
      recommendation: finding.recommendation,
      status: "active",
      detected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Resolve a stored warning (school-scoped).
 */
export async function resolveWarning(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");

  const supabase = await createClient();

  const { error } = await supabase
    .from("early_warnings")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * AI explains a rule finding (severity is fixed by rules and passed
 * as immutable context — the model must not change it).
 */
export async function explainFinding(
  finding: WarningFinding
): Promise<ExplainResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.schoolId) {
      return { success: false, error: "Akun Anda belum terhubung ke sekolah" };
    }
    const supabase = await createClient();

    const prompt = buildWarningExplanationPrompt(finding);
    const { text: rawResponse, label: modelLabel } = await generateAIText(
      user.schoolId,
      prompt,
      { maxTokens: 1200 }
    );
    const sanitized = sanitizeAIOutput(
      validateAIOutputWithFallback(rawResponse)
    );

    await supabase.from("ai_interactions").insert({
      school_id: user.schoolId,
      user_id: user.id,
      feature: "early_warning",
      question: `Jelaskan peringatan ${finding.type} untuk guru`,
      context: {
        teacher_id: finding.teacherId,
        type: finding.type,
        severity: finding.severity,
        evidence: finding.evidence,
      },
      response: sanitized as unknown as object,
      model: modelLabel,
    });

    return { success: true, data: sanitized };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}
