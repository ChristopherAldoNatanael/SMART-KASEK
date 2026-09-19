/**
 * Fondasi AI SMART KASEK — SERVER ONLY.
 *
 * Jangan import file ini dari Client Component: API key hanya boleh
 * dibaca di server (process.env tidak terkirim ke browser).
 *
 * Memakai endpoint OpenAI-compatible milik Google AI Studio
 * (AI_BASE_URL + AI_API_KEY + AI_MODEL dari environment), sehingga
 * tanpa dependency SDK tambahan — cukup fetch bawaan Node.
 */

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}

export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getAIConfig(): { baseUrl: string; apiKey: string; model: string } {
  if (typeof window !== "undefined") {
    throw new AIError("AI hanya dapat dipanggil dari server.");
  }
  const baseUrl = (process.env.AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  const model = (process.env.AI_MODEL ?? "").trim() || "gemini-2.5-flash";
  if (!baseUrl || !apiKey) {
    throw new AIError(
      "Layanan AI belum dikonfigurasi. Hubungi administrator sekolah."
    );
  }
  return { baseUrl, apiKey, model };
}

/** Hash kecil stabil untuk cache (mendeteksi data sumber berubah). */
export function stableHash(value: unknown): string {
  const text = JSON.stringify(value) ?? "";
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

function stripFences(text: string): string {
  const cleaned = text.trim();
  const match = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (match ? match[1] : cleaned).trim();
}

/**
 * Panggil chat completions dan kembalikan JSON tervalidasi parsial.
 * Error selalu berupa AIError berbahasa Indonesia yang aman
 * ditampilkan ke pengguna (tanpa detail API mentah).
 */
export async function chatJson<T>(input: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Internal: penanda ulangan akibat terpotong (tidak untuk pemanggil). */
  _retried?: boolean;
}): Promise<T> {
  const { baseUrl, apiKey, model } = getAIConfig();

  async function attempt(): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      return await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          temperature: input.temperature ?? 0.3,
          max_tokens: input.maxTokens ?? 500,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIError("Analisis AI membutuhkan waktu lebih lama. Silakan coba lagi.");
      }
      throw new AIError("AI sedang tidak dapat digunakan. Silakan coba lagi.");
    } finally {
      clearTimeout(timer);
    }
  }

  let res: Response;
  try {
    res = await attempt();
  } catch (error) {
    // Gangguan jaringan sesaat — coba sekali lagi otomatis.
    await new Promise((r) => setTimeout(r, 2000));
    res = await attempt();
  }
  if (res.status >= 500) {
    // Model sibuk/overload (umum di tier gratis) — coba sekali lagi otomatis.
    await new Promise((r) => setTimeout(r, 2000));
    res = await attempt();
  }

  if (res.status === 401 || res.status === 403) {
    throw new AIError(
      "Layanan AI belum dikonfigurasi. Hubungi administrator sekolah."
    );
  }
  if (res.status === 429) {
    throw new AIError("Batas penggunaan AI sedang tercapai. Silakan coba lagi nanti.");
  }
  if (!res.ok) {
    // Catat status + potongan respons untuk diagnosis (tanpa key).
    try {
      const snippet = (await res.clone().text()).slice(0, 300);
      console.error(`AI request failed: HTTP ${res.status} — ${snippet}`);
    } catch {
      console.error(`AI request failed: HTTP ${res.status}`);
    }
    throw new AIError("AI sedang tidak dapat digunakan. Silakan coba lagi.");
  }

  // Baca sebagai teks dulu agar isi non-JSON pun bisa dicatat untuk diagnosis.
  let rawText: string;
  try {
    rawText = await res.text();
  } catch {
    throw new AIError("AI sedang tidak dapat digunakan. Silakan coba lagi.");
  }
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    console.error(`AI bad body (bukan JSON): ${rawText.slice(0, 300)}`);
    throw new AIError("AI sedang tidak dapat digunakan. Silakan coba lagi.");
  }
  const choice = (
    json as { choices?: { message?: { content?: string }; finish_reason?: string }[] }
  )?.choices?.[0];
  const content = choice?.message?.content ?? "";
  if (!content.trim()) {
    console.error(`AI empty content: ${rawText.slice(0, 300)}`);
    throw new AIError("AI sedang tidak dapat digunakan. Silakan coba lagi.");
  }
  try {
    return JSON.parse(stripFences(content)) as T;
  } catch {
    // Terpotong karena pagu token habis (finish_reason length) — ulangi
    // sekali dengan pagu ganda, bukan gagal ke pengguna.
    if (choice?.finish_reason === "length" && !input._retried) {
      return chatJson({ ...input, maxTokens: (input.maxTokens ?? 500) * 2, _retried: true });
    }
    console.error(`AI bad content: ${content.slice(0, 300)}`);
    throw new AIError("AI sedang tidak dapat digunakan. Silakan coba lagi.");
  }
}

/** Batasan jumlah item array + panjang string dari output AI. */
export function capList(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .map((v) => String(v).trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, max);
}

export function capText(value: unknown, max = 600): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
