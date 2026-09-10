"use client";

import { useFormState, useFormStatus } from "react-dom";
import { deleteLessonPlanAction } from "@/app/(shell)/learning/actions";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Hapus modul ajar"
      className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}

export default function LessonDeleteButton({ lessonId }: { lessonId: string }) {
  const [, formAction] = useFormState(deleteLessonPlanAction, {
    ok: false,
    error: null,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <DeleteButton />
    </form>
  );
}
