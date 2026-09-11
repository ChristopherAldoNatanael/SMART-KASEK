"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  createAIConfig,
  deleteAIConfig,
  testAIConfig,
  toggleAIConfig,
} from "@/services/ai-config.service";
import {
  aiConfigIdSchema,
  createAIConfigSchema,
  firstIssueMessage,
  toggleAIConfigSchema,
} from "@/schemas/ai-config";

export type AIConfigActionState = {
  ok: boolean;
  error: string | null;
  testOk?: boolean | null;
};

async function gate(): Promise<string | null> {
  const user = await requireUser();
  if (!user.schoolId) return "Akun Anda belum terhubung ke sekolah.";
  if (!hasRole(user.role, "principal")) {
    return "Hanya Kepala Sekolah yang dapat mengelola AI.";
  }
  return null;
}

function revalidate() {
  revalidatePath("/settings/ai");
}

export async function createAIConfigAction(
  _prev: AIConfigActionState,
  formData: FormData
): Promise<AIConfigActionState> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };

  const parsed = createAIConfigSchema.safeParse({
    label: formData.get("label"),
    provider: formData.get("provider"),
    baseUrl: formData.get("baseUrl"),
    model: formData.get("model"),
    apiKey: formData.get("apiKey"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await createAIConfig({
      label: parsed.data.label,
      provider: parsed.data.provider,
      baseUrl: parsed.data.baseUrl,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey,
      priority: parsed.data.priority,
    });
  } catch (error) {
    console.error("createAIConfigAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan",
    };
  }

  revalidate();
  return { ok: true, error: null };
}

export async function toggleAIConfigAction(
  _prev: AIConfigActionState,
  formData: FormData
): Promise<AIConfigActionState> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };

  const parsed = toggleAIConfigSchema.safeParse({
    configId: formData.get("configId"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await toggleAIConfig(parsed.data.configId, parsed.data.active);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan",
    };
  }

  revalidate();
  return { ok: true, error: null };
}

export async function deleteAIConfigAction(
  _prev: AIConfigActionState,
  formData: FormData
): Promise<AIConfigActionState> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };

  const parsed = aiConfigIdSchema.safeParse({
    configId: formData.get("configId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await deleteAIConfig(parsed.data.configId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus",
    };
  }

  revalidate();
  return { ok: true, error: null };
}

export async function testAIConfigAction(
  _prev: AIConfigActionState,
  formData: FormData
): Promise<AIConfigActionState> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };

  const parsed = aiConfigIdSchema.safeParse({
    configId: formData.get("configId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const result = await testAIConfig(parsed.data.configId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Tes koneksi gagal", testOk: false };
  }
  return { ok: true, error: null, testOk: true };
}
