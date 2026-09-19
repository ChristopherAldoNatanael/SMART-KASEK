"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ClipboardList } from "lucide-react";
import {
  generateCoachDraftAction,
  saveCoachDraftAction,
} from "@/app/(shell)/supervision/ai-actions";
import type { CoachingDraft } from "@/services/ai.service";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      <ClipboardList className="h-5 w-5" aria-hidden />
      {pending ? "Menyusun draf..." : "Buat Rencana Coaching"}
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan ke Coaching"}
    </button>
  );
}

/**
 * AI Coach: AI menyusun DRAF rencana → Kepala Sekolah membaca,
 * mengedit, lalu menyimpan ke alur Coaching existing.
 * Tidak ada penyimpanan otomatis.
 */
export default function AICoachDraft({
  supervisionId,
  teacherId,
  teacherName,
}: {
  supervisionId: string;
  teacherId: string;
  teacherName: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const [focus, setFocus] = useState("");
  const [objective, setObjective] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [followUpTarget, setFollowUpTarget] = useState("");
  const [reflectionText, setReflectionText] = useState("");
  const [sessionDate, setSessionDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const [draftState, draftAction] = useFormState(generateCoachDraftAction, {
    ok: false,
    error: null,
    data: null,
  });
  const [saveState, saveAction] = useFormState(saveCoachDraftAction, {
    ok: false,
    error: null,
    sessionId: null,
  });

  const lastDraft = useRef(draftState);
  // Pola toast-after-action yang sama dipakai di seluruh form aplikasi.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lastDraft.current !== draftState) {
      lastDraft.current = draftState;
      if (draftState.error) {
        toast.error("Draf belum berhasil dibuat", draftState.error);
      } else if (draftState.ok && draftState.data) {
        const d: CoachingDraft = draftState.data;
        setFocus(d.focus);
        setObjective(d.objective);
        setStepsText(d.steps.join("\n"));
        setFollowUpTarget(d.followUpTarget);
        setReflectionText(d.reflectionQuestions.join("\n"));
        setEditing(true);
        toast.success("Draf siap", "Periksa dan ubah seperlunya sebelum disimpan.");
        startTransition(() => router.refresh());
      }
    }
  });

  const lastSave = useRef(saveState);
  useEffect(() => {
    if (lastSave.current !== saveState) {
      lastSave.current = saveState;
      if (saveState.error) {
        toast.error("Belum berhasil menyimpan", saveState.error);
      }
    }
  });

  if (!editing) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-center">
        <p className="text-[15px] font-semibold">
          Ubah temuan di atas menjadi rencana coaching
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          AI menyusun draf (fokus, tujuan, langkah, target, pertanyaan
          refleksi). Anda periksa dan ubah dulu sebelum disimpan.
        </p>
        <form action={draftAction} className="mt-4">
          <input type="hidden" name="supervisionId" value={supervisionId} />
          <GenerateButton />
        </form>
      </div>
    );
  }

  return (
    <form action={saveAction} className="space-y-4 rounded-xl border bg-card p-5">
      <input type="hidden" name="supervisionId" value={supervisionId} />
      <input type="hidden" name="teacherId" value={teacherId} />

      <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
        Draf untuk <strong className="text-foreground">{teacherName}</strong>.
        Semua boleh diubah. Baru tersimpan setelah Anda menekan tombol di bawah.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="coach-date" className="text-[15px] font-semibold">
            Tanggal sesi
          </label>
          <input
            id="coach-date"
            name="sessionDate"
            type="date"
            required
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="coach-focus" className="text-[15px] font-semibold">
            Fokus Coaching
          </label>
          <input
            id="coach-focus"
            name="focus"
            required
            maxLength={500}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="coach-objective" className="text-[15px] font-semibold">
          Tujuan
        </label>
        <textarea
          id="coach-objective"
          name="objective"
          required
          rows={3}
          maxLength={1000}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="coach-steps" className="text-[15px] font-semibold">
          Langkah Coaching <span className="font-normal text-muted-foreground">(satu per baris, maks 5)</span>
        </label>
        <textarea
          id="coach-steps"
          name="stepsText"
          rows={5}
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          className={cn(inputClass, "leading-relaxed")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="coach-target" className="text-[15px] font-semibold">
          Target Tindak Lanjut
        </label>
        <textarea
          id="coach-target"
          name="followUpTarget"
          rows={2}
          maxLength={1000}
          value={followUpTarget}
          onChange={(e) => setFollowUpTarget(e.target.value)}
          placeholder="Hal konkret yang dilakukan guru setelah sesi..."
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="coach-reflection" className="text-[15px] font-semibold">
          Pertanyaan Refleksi <span className="font-normal text-muted-foreground">(satu per baris, maks 3)</span>
        </label>
        <textarea
          id="coach-reflection"
          name="reflectionText"
          rows={3}
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          className={cn(inputClass, "leading-relaxed")}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SaveButton />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
