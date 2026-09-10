"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateSupervisionStatusAction } from "@/app/(shell)/supervision/actions";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan Status"}
    </button>
  );
}

export default function SupervisionStatusForm({
  supervisionId,
  current,
}: {
  supervisionId: string;
  current: string;
}) {
  const [state, formAction] = useFormState(updateSupervisionStatusAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="supervisionId" value={supervisionId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-64">
          <label htmlFor="supervision-status" className="text-sm font-medium">
            Ubah Status Supervisi
          </label>
          <select
            id="supervision-status"
            name="status"
            defaultValue={current}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="completed">Selesai</option>
            <option value="follow_up">Tindak Lanjut</option>
            <option value="closed">Ditutup</option>
          </select>
        </div>
        <SubmitButton />
      </div>
      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}
      {state.ok && (
        <div
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700"
        >
          Berhasil disimpan.
        </div>
      )}
    </form>
  );
}
