import { z } from "zod";

export type AIFeature = "assistant" | "coach" | "school_insight" | "early_warning";

export interface AIRequest {
  feature: AIFeature;
  userId: string;
  schoolId: string;
  question?: string;
  context?: Record<string, unknown>;
}

export interface AIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export const AIOutputSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  areas: z.array(z.string()),
  priority: z.enum(["low", "medium", "high", "critical"]),
  recommendations: z.array(z.string()),
  suggested_actions: z.array(
    z.object({
      action: z.string(),
      target_days: z.number().optional(),
    })
  ),
});

export type AIOutput = z.infer<typeof AIOutputSchema>;

export interface IAIProvider {
  generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;
}
