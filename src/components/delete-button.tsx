"use client";

import { useFormState, useFormStatus } from "react-dom";

export type DeleteState = { ok: boolean; error: string | null };

function ConfirmSubmitButton({
  label,
  pendingLabel,
  confirmText,
}: {
  label: string;
  pendingLabel: string;
  confirmText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Generic delete button wired to a server action.
 * Renders nothing on success (caller should redirect or revalidate away).
 */
export default function DeleteButton({
  action,
  idName,
  idValue,
  label = "Hapus",
  confirmText = "Hapus data ini? Tindakan tidak dapat dibatalkan.",
}: {
  action: (
    prev: DeleteState,
    formData: FormData
  ) => Promise<DeleteState>;
  idName: string;
  idValue: string;
  label?: string;
  confirmText?: string;
}) {
  const [state, formAction] = useFormState(action, {
    ok: false,
    error: null,
  });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name={idName} value={idValue} />
        <ConfirmSubmitButton
          label={label}
          pendingLabel="Menghapus…"
          confirmText={confirmText}
        />
      </form>
      {state.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </span>
  );
}
