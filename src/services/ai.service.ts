"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePrincipal } from "@/lib/permissions";
import {
  buildTeacherContext,
  buildSchoolContext,
  type TeacherContext,
  type SchoolInsightContext,
} from "@/lib/ai/context";
import { buildPrompt } from "@/lib/ai/prompts";
import { getAIProvider, getProviderInfo } from "@/lib/ai/provider";
import {
  validateAIOutputWithFallback,
  sanitizeAIOutput,
  type ValidatedAIOutput,
} from "@/lib/ai/validators";
import type { AIFeature } from "@/lib/ai/types";

export interface AIServiceResult {
  success: boolean;
  data?: ValidatedAIOutput;
  error?: string;
}

/**
 * Generate AI Coach analysis for a teacher.
 */
export async function generateCoachAnalysis(input: {
  teacherId: string;
  question?: string;
}): Promise<AIServiceResult> {
  try {
    const user = await requirePrincipal();
    if (!user.schoolId) {
      return { success: false, error: "Akun Anda belum terhubung ke sekolah" };
    }
    const supabase = await createClient();

    // Build context (school-scoped: cross-school teachers resolve to null)
    const context = await buildTeacherContext(input.teacherId, user.schoolId);
    if (!context) {
      return { success: false, error: "Guru tidak ditemukan" };
    }

    // Build prompt
    const prompt = buildPrompt("coach", context, input.question);

    // Get AI response
    const provider = getAIProvider();
    const rawResponse = await provider.generate(prompt);

    // Validate and sanitize output
    const validatedOutput = validateAIOutputWithFallback(rawResponse);
    const sanitizedOutput = sanitizeAIOutput(validatedOutput);

    // Log interaction
    await supabase.from("ai_interactions").insert({
      school_id: user.schoolId,
      user_id: user.id,
      feature: "coach",
      question: input.question || null,
      context: { teacher_id: input.teacherId },
      response: sanitizedOutput as unknown as object,
      model: `${getProviderInfo().provider}:${getProviderInfo().model}`,
    });

    return { success: true, data: sanitizedOutput };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

/**
 * Generate AI School Insight.
 */
export async function generateSchoolInsight(): Promise<AIServiceResult> {
  try {
    const user = await requirePrincipal();
    if (!user.schoolId) {
      return { success: false, error: "Akun Anda belum terhubung ke sekolah" };
    }
    const supabase = await createClient();

    // Build context
    const context = await buildSchoolContext(user.schoolId);

    // Build prompt
    const prompt = buildPrompt("school_insight", context);

    // Get AI response
    const provider = getAIProvider();
    const rawResponse = await provider.generate(prompt);

    // Validate and sanitize output
    const validatedOutput = validateAIOutputWithFallback(rawResponse);
    const sanitizedOutput = sanitizeAIOutput(validatedOutput);

    // Log interaction
    await supabase.from("ai_interactions").insert({
      school_id: user.schoolId,
      user_id: user.id,
      feature: "school_insight",
      context: { teacher_count: context.teacherCount },
      response: sanitizedOutput as unknown as object,
      model: `${getProviderInfo().provider}:${getProviderInfo().model}`,
    });

    // Store insight
    await supabase.from("ai_insights").insert({
      school_id: user.schoolId,
      type: "school_performance",
      title: "School Insight",
      content: sanitizedOutput.summary,
      priority: sanitizedOutput.priority,
      source_data: context as unknown as object,
      status: "active",
    });

    return { success: true, data: sanitizedOutput };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

/**
 * Generate Early Warning analysis.
 */
export async function generateEarlyWarning(): Promise<AIServiceResult> {
  try {
    const user = await requirePrincipal();
    if (!user.schoolId) {
      return { success: false, error: "Akun Anda belum terhubung ke sekolah" };
    }
    const supabase = await createClient();

    // Build context
    const context = await buildSchoolContext(user.schoolId);

    // Build prompt
    const prompt = buildPrompt("early_warning", context);

    // Get AI response
    const provider = getAIProvider();
    const rawResponse = await provider.generate(prompt);

    // Validate and sanitize output
    const validatedOutput = validateAIOutputWithFallback(rawResponse);
    const sanitizedOutput = sanitizeAIOutput(validatedOutput);

    // Log interaction
    await supabase.from("ai_interactions").insert({
      school_id: user.schoolId,
      user_id: user.id,
      feature: "early_warning",
      context: { teacher_count: context.teacherCount },
      response: sanitizedOutput as unknown as object,
      model: `${getProviderInfo().provider}:${getProviderInfo().model}`,
    });

    // Store warnings if any
    if (sanitizedOutput.suggested_actions.length > 0) {
      const warnings = sanitizedOutput.suggested_actions.map((action) => ({
        school_id: user.schoolId,
        type: "ai_generated",
        severity: sanitizedOutput.priority,
        title: action.action,
        description: sanitizedOutput.summary,
        recommendation: sanitizedOutput.recommendations.join("; "),
        status: "active",
      }));

      await supabase.from("early_warnings").insert(warnings);
    }

    return { success: true, data: sanitizedOutput };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

/**
 * Handle AI Assistant chat.
 */
export async function handleAssistantChat(
  question: string
): Promise<AIServiceResult> {
  try {
    const user = await requirePrincipal();
    if (!user.schoolId) {
      return { success: false, error: "Akun Anda belum terhubung ke sekolah" };
    }
    const supabase = await createClient();

    // Build school context for assistant
    const context = await buildSchoolContext(user.schoolId);

    // Build prompt with question
    const prompt = buildPrompt("assistant", context, question);

    // Get AI response
    const provider = getAIProvider();
    const rawResponse = await provider.generate(prompt);

    // Validate and sanitize output
    const validatedOutput = validateAIOutputWithFallback(rawResponse);
    const sanitizedOutput = sanitizeAIOutput(validatedOutput);

    // Log interaction
    await supabase.from("ai_interactions").insert({
      school_id: user.schoolId,
      user_id: user.id,
      feature: "assistant",
      question,
      context: { teacher_count: context.teacherCount },
      response: sanitizedOutput as unknown as object,
      model: `${getProviderInfo().provider}:${getProviderInfo().model}`,
    });

    return { success: true, data: sanitizedOutput };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

/**
 * Get AI interaction history for the school.
 */
export async function getAIInteractionHistory(limit = 20) {
  const user = await requirePrincipal();
  if (!user.schoolId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_interactions")
    .select("*")
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get stored AI insights for the school.
 */
export async function getStoredInsights() {
  const user = await requirePrincipal();
  if (!user.schoolId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("status", "active")
    .order("generated_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Log an AI interaction manually.
 */
export async function logAIInteraction(input: {
  feature: AIFeature;
  question?: string;
  context?: Record<string, unknown>;
  response: Record<string, unknown>;
}): Promise<void> {
  const user = await requirePrincipal();
  if (!user.schoolId) return;

  const supabase = await createClient();

  await supabase.from("ai_interactions").insert({
    school_id: user.schoolId,
    user_id: user.id,
    feature: input.feature,
    question: input.question || null,
    context: input.context || null,
    response: input.response as unknown as object,
    model: process.env.AI_PROVIDER || "mock",
  });
}

export type { TeacherContext, SchoolInsightContext };
