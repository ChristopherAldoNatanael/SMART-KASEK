"use client";

import { useFormState, useFormStatus } from "react-dom";
import { toggleActiveAction } from "@/app/(shell)/teachers/actions";

function ToggleButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            isActive
              ? "Nonaktifkan guru ini? Ia tidak bisa login sampai diaktifkan lagi. Riwayat tetap tersimpan."
              : "Aktifkan kembali guru ini?"
          )
        ) {
          e.preventDefault();
        }
      }}
      className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
    >
      {pending ? "…" : isActive ? "Nonaktifkan" : "Aktifkan"}
    </button>
  );
}

export default function TeacherActiveToggle({
  teacherId,
  isActive,
}: {
  teacherId: string;
  isActive: boolean;
}) {
  const [state, formAction] = useFormState(toggleActiveAction, {
    ok: false,
    error: null,
  });

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <form action={formAction}>
        <input type="hidden" name="teacherId" value={teacherId} />
        <input
          type="hidden"
          name="active"
          value={isActive ? "false" : "true"}
        />
        <ToggleButton isActive={isActive} />
      </form>
      {state.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </span>
  );
}
