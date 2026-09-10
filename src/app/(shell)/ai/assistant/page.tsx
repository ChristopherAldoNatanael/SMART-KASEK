"use client";

import { useState } from "react";
import { Bot, SendHorizontal, UserRound } from "lucide-react";
import { handleAssistantChat } from "@/services/ai.service";
import type { ValidatedAIOutput } from "@/lib/ai/validators";
import { PageHeader } from "@/components/common";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  data?: ValidatedAIOutput;
}

const SUGGESTIONS = [
  "Guru mana yang paling membutuhkan coaching?",
  "Apa kompetensi terlemah di sekolah ini?",
  "Ringkas tindak lanjut yang terlambat",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    const response = await handleAssistantChat(text);

    if (response.success && response.data) {
      const data = response.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.summary,
          data,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.error ?? "Terjadi kesalahan" },
      ]);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await ask(input);
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader
        eyebrow="Kecerdasan"
        title="AI Assistant"
        description="Tanya jawab seputar kondisi sekolah berbasis data — jawaban bersifat bahan pertimbangan."
      />

      <div className="mt-2 flex-1 overflow-y-auto rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10">
              <Bot className="h-5 w-5 text-brand" aria-hidden />
            </span>
            <p className="mt-4 font-semibold">
              Mulai percakapan dengan asisten sekolah
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Asisten membaca data supervisi, coaching, dan perkembangan guru
              sebelum menjawab.
            </p>
            <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message, index) => (
              <div key={index} className="flex gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-brand/10 text-brand"
                  )}
                >
                  {message.role === "user" ? (
                    <UserRound className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Bot className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {message.role === "user" ? "Anda" : "Asisten"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">
                    {message.content}
                  </p>
                  {message.data && (
                    <div className="mt-3 grid gap-3 rounded-lg bg-muted/60 p-3 sm:grid-cols-3">
                      {message.data.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold">Kekuatan</p>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {message.data.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {message.data.areas.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold">
                            Perlu Ditingkatkan
                          </p>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {message.data.areas.map((a, i) => (
                              <li key={i}>• {a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {message.data.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold">Rekomendasi</p>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {message.data.recommendations.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
                  <Bot className="h-3.5 w-3.5 text-brand" aria-hidden />
                </span>
                <div className="flex items-center gap-1 py-2" aria-label="Menunggu jawaban">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaan tentang sekolah Anda…"
          aria-label="Pertanyaan untuk AI Assistant"
          className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Kirim pertanyaan"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>
    </div>
  );
}
