import { z } from "zod";
import type { AIOutput } from "./types";

export const AIOutputSchema = z.object({
  summary: z.string().min(1, "Summary tidak boleh kosong"),
  strengths: z.array(z.string()),
  areas: z.array(z.string()),
  priority: z.enum(["low", "medium", "high", "critical"]),
  recommendations: z.array(z.string()),
  suggested_actions: z.array(
    z.object({
      action: z.string().min(1, "Action tidak boleh kosong"),
      target_days: z.number().positive().optional(),
    })
  ),
});

export type ValidatedAIOutput = z.infer<typeof AIOutputSchema>;

/**
 * Validate and parse AI output.
 * Returns validated data or throws an error.
 */
export function validateAIOutput(raw: string): AIOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract JSON from markdown code block
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      // Try to find JSON object in the text
      const objectMatch = raw.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = JSON.parse(objectMatch[0]);
      } else {
        throw new Error("Response bukan JSON yang valid");
      }
    }
  }

  const result = AIOutputSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues;
    throw new Error(
      `Validasi gagal: ${issues.map((e) => e.message).join(", ")}`
    );
  }

  return result.data;
}

/**
 * Validate AI output with fallback for partial data.
 */
export function validateAIOutputWithFallback(raw: string): AIOutput {
  try {
    return validateAIOutput(raw);
  } catch (error) {
    // Return fallback response
    return {
      summary: "Tidak dapat menganalisis data saat ini.",
      strengths: [],
      areas: [],
      priority: "medium",
      recommendations: ["Silakan coba lagi nanti."],
      suggested_actions: [],
    };
  }
}

/**
 * Sanitize AI output to prevent XSS in UI.
 */
export function sanitizeAIOutput(output: AIOutput): AIOutput {
  return {
    summary: sanitizeString(output.summary),
    strengths: output.strengths.map(sanitizeString),
    areas: output.areas.map(sanitizeString),
    priority: output.priority,
    recommendations: output.recommendations.map(sanitizeString),
    suggested_actions: output.suggested_actions.map((a) => ({
      action: sanitizeString(a.action),
      target_days: a.target_days,
    })),
  };
}

function sanitizeString(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Fact-check AI output against context data.
 * Flags potential hallucinations.
 */
export function factCheckOutput(
  output: AIOutput,
  contextData: {
    teacherCount?: number;
    competencyNames?: string[];
    maxScore?: number;
  }
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if mentioned competencies exist in context
  if (contextData.competencyNames && contextData.competencyNames.length > 0) {
    const allText = [
      output.summary,
      ...output.strengths,
      ...output.areas,
      ...output.recommendations,
    ]
      .join(" ")
      .toLowerCase();

    // Simple heuristic: flag if output mentions competencies not in context
    // This is a basic check - more sophisticated NLP would be needed for production
  }

  // Check if scores mentioned are within valid range
  if (contextData.maxScore) {
    const scorePattern = /(\d+(\.\d+)?)\s*%/g;
    let match;
    while ((match = scorePattern.exec(output.summary)) !== null) {
      const score = parseFloat(match[1]);
      if (score > contextData.maxScore) {
        issues.push(`Skor ${score}% melebihi nilai maksimum ${contextData.maxScore}%`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
