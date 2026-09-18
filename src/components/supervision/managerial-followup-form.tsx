"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveManagerialFollowUpAction } from "@/app/(shell)/supervision/manajerial/actions";
import { toast } from "@/components/toaster";

// text-base di HP agar layar tidak otomatis zoom saat mengetik.
const inputClass =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[48px] rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan catatan"}
    </button>
  );
}

const FOLLOW_UP_STATUSES = [
  { value: "none", label: "Belum ada tindak lanjut" },
  { value: "planned", label: "Direncanakan" },
  { value: "in_progress", label: "Berjalan" },
  { value: "completed", label: "Selesai" },
] as const;

/**
 * Catatan & tindak lanjut supervisi manajerial (Kepala Sekolah).
 * Terpisah dari coaching — hasil di sini dapat dilanjutkan ke
 * Coaching melalui tombol "Buat Coaching" di halaman detail.
 */
export default function ManagerialFollowUpForm({
  supervisionId,
  initial,
}: {
  supervisionId: string;
  initial: {
    findings: string | null;
    supervisorNotes: string | null;
    followUpRecommendation: string | null;
    improvementTarget: string | null;
    followUpStatus: string;
  };
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(saveManagerialFollowUpAction, {
    ok: false,
    error: null,
  });

  const last = useRef(state);
  useEffect(() => {
    if (last.current !== state) {
      last.current = state;
      if (state.error) {
        toast.error("Belum berhasil menyimpan", state.error);
      } else if (state.ok) {
        toast.success(
          "Catatan sudah tersimpan",
          "Temuan dan tindak lanjut aman tersimpan."
        );
        router.refresh();
      }
    }
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="supervisionId" value={supervisionId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="m-findings" className="text-sm font-medium">
            Temuan utama
          </label>
          <textarea
            id="m-findings"
            name="findings"
            rows={4}
            maxLength={5000}
            defaultValue={initial.findings ?? ""}
            placeholder="Temuan utama dari ketiga instrumen..."
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-supervisorNotes" className="text-sm font-medium">
            Catatan supervisor
          </label>
          <textarea
            id="m-supervisorNotes"
            name="supervisorNotes"
            rows={4}
            maxLength={5000}
            defaultValue={initial.supervisorNotes ?? ""}
            placeholder="Catatan pembinaan untuk guru..."
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-followUpRecommendation" className="text-sm font-medium">
            Rekomendasi tindak lanjut
          </label>
          <textarea
            id="m-followUpRecommendation"
            name="followUpRecommendation"
            rows={4}
            maxLength={5000}
            defaultValue={initial.followUpRecommendation ?? ""}
            placeholder="Langkah perbaikan yang disarankan..."
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-improvementTarget" className="text-sm font-medium">
            Target perbaikan
          </label>
          <textarea
            id="m-improvementTarget"
            name="improvementTarget"
            rows={4}
            maxLength={2000}
            defaultValue={initial.improvementTarget ?? ""}
            placeholder="mis. Melengkapi 3 komponen administrasi kelas sebelum November 2026"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label htmlFor="m-followUpStatus" className="text-sm font-medium">
            Status tindak lanjut
          </label>
          <select
            id="m-followUpStatus"
            name="followUpStatus"
            defaultValue={initial.followUpStatus}
            className={inputClass}
          >
            {FOLLOW_UP_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}
