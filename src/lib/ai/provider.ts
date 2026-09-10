import type { IAIProvider } from "./types";

/**
 * AI provider layer (AGENTS.md §15).
 * Business logic depends on IAIProvider, never on a concrete vendor.
 * Switch via env: AI_PROVIDER=mock|openai|custom (+ AI_API_KEY, AI_MODEL, AI_BASE_URL).
 */

const REQUEST_TIMEOUT_MS = 60_000;

export function getProviderInfo(): { provider: string; model: string } {
  const provider = process.env.AI_PROVIDER || "mock";
  const model =
    process.env.AI_MODEL ||
    (provider === "openai" ? "gpt-4o-mini" : "mock");
  return { provider, model };
}

class MockAIProvider implements IAIProvider {
  async generate(prompt: string): Promise<string> {
    // Development fallback when no AI_API_KEY is configured.
    console.log(
      "[MockAIProvider] Prompt received:",
      prompt.substring(0, 100) + "..."
    );

    return JSON.stringify({
      summary:
        "Analisis AI belum tersedia karena AI provider belum dikonfigurasi. Isi AI_API_KEY di environment variables untuk mengaktifkan analisis sungguhan.",
      strengths: [],
      areas: ["Konfigurasi AI provider diperlukan"],
      priority: "medium",
      recommendations: ["Tambahkan AI_API_KEY di environment variables"],
      suggested_actions: [
        {
          action: "Konfigurasi AI provider",
          target_days: 1,
        },
      ],
    });
  }
}

/**
 * Any OpenAI-compatible chat-completions endpoint
 * (OpenAI, Azure OpenAI proxy, local gateways, etc.).
 * Uses response_format json_object so output stays structured.
 */
class OpenAICompatibleProvider implements IAIProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string
  ) {}

  async generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: "system",
                content:
                  "Anda adalah SMART KASEK AI Coach. Jawab SELALU dalam JSON valid sesuai struktur yang diminta. Jangan mengarang angka atau fakta di luar data yang diberikan.",
              },
              { role: "user", content: prompt },
            ],
            temperature: options?.temperature ?? 0.2,
            max_tokens: options?.maxTokens ?? 1500,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        // Never leak keys or raw vendor payloads to the caller.
        console.error(
          "[AIProvider] Vendor error:",
          response.status,
          response.statusText
        );
        throw new Error(
          "Layanan AI gagal merespons. Silakan coba lagi nanti."
        );
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(
          "Layanan AI mengembalikan respons kosong. Silakan coba lagi."
        );
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Permintaan AI habis waktu. Silakan coba lagi.");
      }
      throw error instanceof Error
        ? error
        : new Error("Layanan AI gagal. Silakan coba lagi nanti.");
    } finally {
      clearTimeout(timeout);
    }
  }
}

let providerInstance: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const { provider, model } = getProviderInfo();
  const apiKey = process.env.AI_API_KEY;

  if ((provider === "openai" || provider === "custom") && apiKey) {
    const baseUrl =
      provider === "openai"
        ? "https://api.openai.com/v1"
        : process.env.AI_BASE_URL || "";
    if (baseUrl) {
      providerInstance = new OpenAICompatibleProvider(apiKey, baseUrl, model);
      return providerInstance;
    }
    console.warn(
      "[AIProvider] AI_PROVIDER=custom membutuhkan AI_BASE_URL. Menggunakan Mock."
    );
  } else if (provider !== "mock") {
    console.warn(
      "[AIProvider] AI_API_KEY belum diisi. Menggunakan Mock provider."
    );
  }

  providerInstance = new MockAIProvider();
  return providerInstance;
}

export function setAIProvider(provider: IAIProvider): void {
  providerInstance = provider;
}
