"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  addActionAction,
  updateActionAction,
  updateSessionStatusAction,
  type CoachingActionState,
} from "@/app/(shell)/coaching/actions";
import type { CoachingSessionWithDetails } from "@/services/coaching.service";

type ActionRow = CoachingSessionWithDetails["actions"][number];

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function StateMessage({ state }: { state: CoachingActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
      >
        {state.error}
      </div>
    );
  }
  if (state.ok) {
    return (
      <div
        role="status"
        className="rounded-md bg-green-50 p-3 text-sm text-green-700"
      >
        Berhasil disimpan.
      </div>
    );
  }
  return null;
}

export function SessionStatusForm({
  sessionId,
  current,
}: {
  sessionId: string;
  current: string;
}) {
  const [state, formAction] = useFormState(updateSessionStatusAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-64">
          <label htmlFor="session-status" className="text-sm font-medium">
            Ubah Status Sesi
          </label>
          <select
            id="session-status"
            name="status"
            defaultValue={current}
            className={inputClass}
          >
            <option value="scheduled">Terjadwal</option>
            <option value="in_progress">Berlangsung</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <SubmitButton label="Simpan Status" pendingLabel="Menyimpan..." />
      </div>
      <StateMessage state={state} />
    </form>
  );
}

export function AddActionForm({ sessionId }: { sessionId: string }) {
  const [state, formAction] = useFormState(addActionAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="space-y-2">
        <label htmlFor="new-action" className="text-sm font-medium">
          Tindakan Baru <span className="text-destructive">*</span>
        </label>
        <input
          id="new-action"
          name="action"
          type="text"
          required
          minLength={3}
          maxLength={500}
          placeholder="mis. Menyusun rubrik asesmen formatif"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-56">
          <label htmlFor="new-action-date" className="text-sm font-medium">
            Target Tanggal
          </label>
          <input
            id="new-action-date"
            name="targetDate"
            type="date"
            className={inputClass}
          />
        </div>
        <SubmitButton label="Tambah Tindak Lanjut" pendingLabel="Menambahkan..." />
      </div>
      <StateMessage state={state} />
    </form>
  );
}

export function UpdateActionForm({
  action,
  sessionId,
}: {
  action: ActionRow;
  sessionId: string;
}) {
  const [state, formAction] = useFormState(updateActionAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="mt-3 space-y-3 border-t pt-3">
      <input type="hidden" name="actionId" value={action.id} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <label
            htmlFor={`status-${action.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <select
            id={`status-${action.id}`}
            name="status"
            defaultValue={action.status}
            className={inputClass}
          >
            <option value="pending">Menunggu</option>
            <option value="in_progress">Berlangsung</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`evidence-${action.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Bukti
          </label>
          <input
            id={`evidence-${action.id}`}
            name="evidence"
            type="text"
            defaultValue={action.evidence ?? ""}
            maxLength={2000}
            placeholder="Bukti penyelesaian"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`result-${action.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Hasil
          </label>
          <input
            id={`result-${action.id}`}
            name="result"
            type="text"
            defaultValue={action.result ?? ""}
            maxLength={2000}
            placeholder="Hasil yang dicapai"
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label
          htmlFor={`notes-${action.id}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Catatan
        </label>
        <input
          id={`notes-${action.id}`}
          name="notes"
          type="text"
          defaultValue={action.notes ?? ""}
          maxLength={2000}
          placeholder="Catatan tambahan"
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton label="Simpan" pendingLabel="Menyimpan..." />
        <StateMessage state={state} />
      </div>
    </form>
  );
}
