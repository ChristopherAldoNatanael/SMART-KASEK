"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createAIConfigAction,
  deleteAIConfigAction,
  testAIConfigAction,
  toggleAIConfigAction,
} from "@/app/(shell)/settings/ai/actions";
import type { AIConfigPublic } from "@/services/ai-config.service";
import { Badge } from "@/components/common";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function MiniButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function StateText({ error, okText }: { error: string | null; okText?: string }) {
  if (error) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    );
  }
  return null;
}

export function AddAIConfigForm() {
  const [state, formAction] = useFormState(createAIConfigAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <StateText error={state.error} />
      {state.ok && (
        <p role="status" className="text-xs text-emerald-700">
          Tersimpan. Gunakan Tes Koneksi untuk memastikan berfungsi.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="ai-label" className="text-xs font-medium text-muted-foreground">
            Nama (mis. Utama, Cadangan)
          </label>
          <input
            id="ai-label"
            name="label"
            type="text"
            required
            minLength={2}
            maxLength={50}
            placeholder="Cadangan"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ai-provider" className="text-xs font-medium text-muted-foreground">
            Jenis
          </label>
          <select id="ai-provider" name="provider" defaultValue="custom" className={inputClass}>
            <option value="custom">Custom (OpenAI-compatible)</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="ai-base" className="text-xs font-medium text-muted-foreground">
            Base URL
          </label>
          <input
            id="ai-base"
            name="baseUrl"
            type="text"
            required
            maxLength={200}
            placeholder="https://…/v1 (tanpa /chat/completions)"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ai-model" className="text-xs font-medium text-muted-foreground">
            Model
          </label>
          <input
            id="ai-model"
            name="model"
            type="text"
            required
            maxLength={100}
            placeholder="mis. gemini-2.5-flash"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ai-priority" className="text-xs font-medium text-muted-foreground">
            Prioritas (kecil = dicoba dulu)
          </label>
          <input
            id="ai-priority"
            name="priority"
            type="number"
            min={1}
            max={1000}
            defaultValue={100}
            className={`${inputClass} tnum`}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="ai-key" className="text-xs font-medium text-muted-foreground">
            API Key
          </label>
          <input
            id="ai-key"
            name="apiKey"
            type="password"
            required
            minLength={8}
            maxLength={500}
            autoComplete="off"
            placeholder="Tempel kunci — tersimpan di server, tak pernah tampil penuh"
            className={inputClass}
          />
        </div>
      </div>
      <SubmitButton label="Simpan Konfigurasi" pendingLabel="Menyimpan…" />
    </form>
  );
}

export function AIConfigCard({ config }: { config: AIConfigPublic }) {
  const [toggleState, toggleFormAction] = useFormState(toggleAIConfigAction, {
    ok: false,
    error: null,
  });
  const [deleteState, deleteFormAction] = useFormState(deleteAIConfigAction, {
    ok: false,
    error: null,
  });
  const [testState, testFormAction] = useFormState(testAIConfigAction, {
    ok: false,
    error: null,
  });

  return (
    <article className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{config.label}</p>
          <p className="tnum mt-0.5 text-xs text-muted-foreground">
            {config.provider} • {config.model} • prioritas {config.priority}
          </p>
          <p className="tnum mt-1 text-xs text-muted-foreground">
            Key: <code className="rounded bg-muted px-1">{config.keySuffix}</code>
          </p>
        </div>
        <Badge tone={config.is_active ? "success" : "neutral"}>
          {config.is_active ? "Aktif" : "Nonaktif"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        <form action={testFormAction}>
          <input type="hidden" name="configId" value={config.id} />
          <MiniButton label="Tes Koneksi" pendingLabel="Mengetes…" />
        </form>
        <form action={toggleFormAction}>
          <input type="hidden" name="configId" value={config.id} />
          <input
            type="hidden"
            name="active"
            value={config.is_active ? "false" : "true"}
          />
          <MiniButton
            label={config.is_active ? "Nonaktifkan" : "Aktifkan"}
            pendingLabel="…"
          />
        </form>
        <form
          action={deleteFormAction}
          onSubmit={(e) => {
            if (!window.confirm(`Hapus konfigurasi "${config.label}"?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="configId" value={config.id} />
          <MiniButton label="Hapus" pendingLabel="…" />
        </form>
        {(testState.testOk || testState.error || toggleState.error || deleteState.error) && (
          <span
            role={testState.error || toggleState.error || deleteState.error ? "alert" : "status"}
            className={`text-xs ${testState.error || toggleState.error || deleteState.error ? "text-destructive" : "text-emerald-700"}`}
          >
            {testState.testOk
              ? "Koneksi OK."
              : (testState.error ?? toggleState.error ?? deleteState.error)}
          </span>
        )}
      </div>
    </article>
  );
}
