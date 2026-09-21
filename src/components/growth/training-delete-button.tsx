"use client";

import DeleteButton, { type DeleteState } from "@/components/delete-button";
import { deleteTrainingAction } from "@/app/(shell)/growth/actions";

async function deleteTrainingAdapter(
  _prev: DeleteState,
  formData: FormData
): Promise<DeleteState> {
  const result = await deleteTrainingAction(
    { ok: false, error: null, trainingId: null },
    formData
  );
  return { ok: result.ok, error: result.error };
}

/**
 * Tombol hapus pelatihan (Kepala Sekolah) dengan dialog konfirmasi.
 * Menghapus kegiatan sekaligus keikutsertaan pesertanya (CASCADE)
 * sehingga rekap Teacher Growth otomatis menyesuaikan.
 */
export default function TrainingDeleteButton({
  trainingId,
  trainingName,
}: {
  trainingId: string;
  trainingName: string;
}) {
  return (
    <DeleteButton
      action={deleteTrainingAdapter}
      idName="trainingId"
      idValue={trainingId}
      label="Hapus"
      confirmText={`Hapus pelatihan "${trainingName}" beserta data pesertanya?`}
    />
  );
}
