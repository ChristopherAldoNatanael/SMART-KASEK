import { createClient } from "@/lib/supabase/server";
import {
  createProvider,
  getEnvProviderConfig,
} from "./provider";

export type AITextResult = {
  text: string;
  /** Audit label, e.g. "db:Utama:custom:ModelX" or "env:custom:model". */
  label: string;
};

/**
 * Generate AI text with automatic fallback (AGENTS.md §15–§16).
 * Order: school DB configs (priority asc) → env config → error.
 * Secrets never leave the server: only text + label are returned.
 */
export async function generateAIText(
  schoolId: string,
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<AITextResult> {
  const supabase = await createClient();

  const { data: configs } = await supabase
    .from("ai_provider_configs")
    .select("label, provider, base_url, model, api_key")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("label", { ascending: true });

  const candidates: { label: string; exec: () => Promise<string> }[] = [];

  for (const c of configs ?? []) {
    if (!c.api_key || !c.base_url || !c.model) continue;
    const label = `db:${c.label}:${c.provider}:${c.model}`;
    candidates.push({
      label,
      exec: () =>
        createProvider({
          apiKey: c.api_key as string,
          baseUrl: c.base_url as string,
          model: c.model as string,
        }).generate(prompt, options),
    });
  }

  const env = getEnvProviderConfig();
  if (env) {
    candidates.push({
      label: env.label,
      exec: () =>
        createProvider({
          apiKey: env.apiKey,
          baseUrl: env.baseUrl,
          model: env.model,
        }).generate(prompt, options),
    });
  }

  if (candidates.length === 0) {
    throw new Error(
      "Layanan AI belum dikonfigurasi. Tambahkan API key di Pengaturan → AI."
    );
  }

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const text = await candidate.exec();
      return { text, label: candidate.label };
    } catch (error) {
      console.error(`[AIChain] ${candidate.label} gagal:`, error);
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Layanan AI gagal merespons. Silakan coba lagi nanti.");
}
