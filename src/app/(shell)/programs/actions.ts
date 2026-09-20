"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/services/audit.service";
import {
  createProgram,
  deleteProgram,
  updateProgramDetails,
  updateProgramStatus,
} from "@/services/program.service";
import {
  createProgramSchema,
  firstProgramIssueMessage,
  programStatusSchema,
  updateProgramSchema,
} from "@/schemas/programs";
import { PROGRAM_STATUS_LABELS, type ProgramStatusValue } from "@/lib/programs";

export type ProgramActionState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

function fail(error: string): ProgramActionState {
  return { ok: false, error, message: null };
}

function succeed(message: string | null = null): ProgramActionState {
  return { ok: true, error: null, message };
}

/** Tambah program baru (Kepala Sekolah). */
export async function createProgramAction(
  _prev: ProgramActionState,
  formData: FormData
): Promise<ProgramActionState> {
  const parsed = createProgramSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    budget: formData.get("budget"),
    semester: formData.get("semester"),
    academicYear: formData.get("academicYear"),
  });
  if (!parsed.success) return fail(firstProgramIssueMessage(parsed.error));
  try {
    const row = await createProgram({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      budget: parsed.data.budget,
      semester: parsed.data.semester as 1 | 2,
      academicYear: parsed.data.academicYear,
    });
    await logAuditEvent({
      action: "create",
      entity: "programs",
      entityId: row.id,
      newData: { name: row.name },
    }).catch(() => null);
    revalidatePath("/programs");
    revalidatePath("/dashboard");
    return succeed(`"${row.name}" masuk daftar sebagai Rencana.`);
  } catch (error) {
    console.error("createProgramAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menambah program");
  }
}

/** Pindah status program (Kepala Sekolah). */
export async function updateProgramStatusAction(
  _prev: ProgramActionState,
  formData: FormData
): Promise<ProgramActionState> {
  const parsed = programStatusSchema.safeParse({
    programId: formData.get("programId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return fail(firstProgramIssueMessage(parsed.error));
  try {
    const status = parsed.data.status as ProgramStatusValue;
    const row = await updateProgramStatus(parsed.data.programId, status);
    await logAuditEvent({
      action: "update",
      entity: "programs",
      entityId: row.id,
      newData: { status },
    }).catch(() => null);
    revalidatePath("/programs");
    revalidatePath("/dashboard");
    return succeed(`"${row.name}" → ${PROGRAM_STATUS_LABELS[status]}.`);
  } catch (error) {
    console.error("updateProgramStatusAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengubah status");
  }
}

/** Ubah detail program (Kepala Sekolah). */
export async function updateProgramDetailsAction(
  _prev: ProgramActionState,
  formData: FormData
): Promise<ProgramActionState> {
  const parsed = updateProgramSchema.safeParse({
    programId: formData.get("programId"),
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    budget: formData.get("budget"),
    semester: formData.get("semester"),
    academicYear: formData.get("academicYear"),
  });
  if (!parsed.success) return fail(firstProgramIssueMessage(parsed.error));
  try {
    const row = await updateProgramDetails({
      programId: parsed.data.programId,
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      budget: parsed.data.budget,
      semester: parsed.data.semester as 1 | 2,
      academicYear: parsed.data.academicYear,
    });
    await logAuditEvent({
      action: "update",
      entity: "programs",
      entityId: row.id,
      newData: { name: row.name },
    }).catch(() => null);
    revalidatePath("/programs");
    revalidatePath("/dashboard");
    return succeed(`Perubahan "${row.name}" tersimpan.`);
  } catch (error) {
    console.error("updateProgramDetailsAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
  }
}

/**
 * Hapus permanen satu program (Kepala Sekolah).
 * Bentuk state mengikuti DeleteButton generik (ok + error).
 */
export async function deleteProgramAction(
  _prev: { ok: boolean; error: string | null },
  formData: FormData
): Promise<{ ok: boolean; error: string | null }> {
  const programId = String(formData.get("programId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(programId)) {
    return { ok: false, error: "Program tidak valid" };
  }
  try {
    const { name } = await deleteProgram(programId);
    await logAuditEvent({
      action: "delete",
      entity: "programs",
      entityId: programId,
      newData: { name },
    }).catch(() => null);
    revalidatePath("/programs");
    revalidatePath("/dashboard");
    return { ok: true, error: null };
  } catch (error) {
    console.error("deleteProgramAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus program",
    };
  }
}
