"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePrincipal } from "@/lib/permissions";
import { createProvider } from "@/lib/ai/provider";
import { logAuditEvent } from "./audit.service";

export type AIConfigPublic = {
  id: string;
  label: string;
  provider: string;
  base_url: string;
  model: string;
  /** Masked suffix only — full key never leaves the server. */
  keySuffix: string;
  priority: number;
  is_active: boolean;
  created_at: string;
};

function maskKey(key: string): string {
  return "••••" + key.slice(-4);
}

async function schoolScope() {
  const user = await requirePrincipal();
  if (!user.schoolId) throw new Error("No school access");
  return user;
}

/**
 * List configs WITHOUT secrets (masked suffix only — safe for UI).
 */
export async function listAIConfigs(): Promise<AIConfigPublic[]> {
  const user = await schoolScope();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("id, label, provider, base_url, model, api_key, priority, is_active, created_at")
    .eq("school_id", user.schoolId)
    .order("priority", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    // Table missing (migration not applied) → empty, not crash.
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    provider: c.provider,
    base_url: c.base_url,
    model: c.model,
    keySuffix: maskKey(c.api_key ?? ""),
    priority: c.priority,
    is_active: c.is_active,
    created_at: c.created_at,
  }));
}

export async function createAIConfig(input: {
  label: string;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  priority: number;
}) {
  const user = await schoolScope();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_provider_configs")
    .insert({
      school_id: user.schoolId,
      label: input.label,
      provider: input.provider,
      base_url: input.baseUrl.replace(/\/$/, ""),
      model: input.model,
      api_key: input.apiKey,
      priority: input.priority,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Nama konfigurasi sudah dipakai. Gunakan nama lain.");
    }
    throw new Error(error.message);
  }

  await logAuditEvent({
    action: "create",
    entity: "ai_provider_configs",
    entityId: data.id,
    newData: { label: input.label, provider: input.provider },
  });

  return data;
}

export async function toggleAIConfig(id: string, active: boolean): Promise<void> {
  const user = await schoolScope();
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_provider_configs")
    .update({ is_active: active })
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    action: "update",
    entity: "ai_provider_configs",
    entityId: id,
    newData: { is_active: active },
  });
}

export async function deleteAIConfig(id: string): Promise<void> {
  const user = await schoolScope();
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_provider_configs")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    action: "delete",
    entity: "ai_provider_configs",
    entityId: id,
  });
}

/**
 * Test a config with a tiny request. Returns ok/error only —
 * the key is never exposed.
 */
export async function testAIConfig(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await schoolScope();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("base_url, model, api_key")
    .eq("id", id)
    .eq("school_id", user.schoolId)
    .single();

  if (error || !data) {
    return { ok: false, error: "Konfigurasi tidak ditemukan" };
  }

  try {
    await createProvider({
      apiKey: data.api_key,
      baseUrl: data.base_url,
      model: data.model,
    }).generate("Balas hanya dengan teks: OK", { maxTokens: 10 });
    return { ok: true };
  } catch (e) {
    console.error("testAIConfig error:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Tes koneksi gagal",
    };
  }
}
