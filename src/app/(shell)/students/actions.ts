"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logAuditEvent } from "@/services/audit.service";
import {
  bulkDeleteStudents,
  createStudent,
  deleteStudent,
  getPromotePreview,
  importStudents,
  promoteStudents,
  updateStudent,
  type PromotePreview,
} from "@/services/student.service";
import { saveAttendance } from "@/services/student-attendance.service";
import { assignHomeroom } from "@/services/teacher.service";
import { saveMyAssignments } from "@/services/teaching-assignment.service";
import {
  createSchoolClass,
  deleteSchoolClass,
  renameSchoolClass,
  setSchoolClassActive,
} from "@/services/school-class.service";
import {
  createSchoolClassSchema,
  firstClassIssueMessage,
  renameSchoolClassSchema,
  schoolClassIdSchema,
  setSchoolClassActiveSchema,
} from "@/schemas/school-classes";
import {
  academicYearSchema,
  assignHomeroomSchema,
  bulkDeleteStudentsSchema,
  firstStudentIssueMessage,
  saveAttendanceSchema,
  saveMyAssignmentsSchema,
  studentFormSchema,
  studentIdSchema,
  studentImportSchema,
  studentPromoteSchema,
} from "@/schemas/students";

export type StudentActionState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

function fail(error: string): StudentActionState {
  return { ok: false, error, message: null };
}

function succeed(message: string | null = null): StudentActionState {
  return { ok: true, error: null, message };
}

async function requireStudentAccess(): Promise<string | null> {
  const user = await requireUser();
  if (!user.schoolId) return "Akun Anda belum terhubung ke sekolah";
  if (user.role !== "principal" && user.role !== "teacher" && user.role !== "admin") {
    return "Anda tidak memiliki akses ke data siswa";
  }
  return null;
}

/** Tambah 1 siswa. */
export async function createStudentAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const parsed = studentFormSchema.safeParse({
    fullName: formData.get("fullName"),
    studentNumber: formData.get("studentNumber"),
    className: formData.get("className"),
    gender: formData.get("gender") || undefined,
    status: formData.get("status") || "active",
    academicYear: formData.get("academicYear"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const row = await createStudent({
      fullName: parsed.data.fullName,
      studentNumber: parsed.data.studentNumber,
      className: parsed.data.className,
      gender: parsed.data.gender,
      status: parsed.data.status,
      academicYear: parsed.data.academicYear,
    });
    await logAuditEvent({
      action: "create",
      entity: "students",
      entityId: row.id,
      newData: { full_name: row.full_name, academic_year: row.academic_year },
    });
    revalidatePath("/students");
    return succeed(`Data ${row.full_name} sudah tersimpan.`);
  } catch (error) {
    console.error("createStudentAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan data siswa");
  }
}

/** Ubah 1 siswa (termasuk pindah kelas / ganti tahun ajaran). */
export async function updateStudentAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const id = formData.get("studentId");
  const idParsed = studentIdSchema.safeParse(id);
  if (!idParsed.success) return fail("Data siswa tidak valid");

  const parsed = studentFormSchema.safeParse({
    fullName: formData.get("fullName"),
    studentNumber: formData.get("studentNumber"),
    className: formData.get("className"),
    gender: formData.get("gender") || undefined,
    status: formData.get("status") || "active",
    academicYear: formData.get("academicYear"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const row = await updateStudent(idParsed.data, {
      fullName: parsed.data.fullName,
      studentNumber: parsed.data.studentNumber,
      className: parsed.data.className,
      gender: parsed.data.gender,
      status: parsed.data.status,
      academicYear: parsed.data.academicYear,
    });
    await logAuditEvent({
      action: "update",
      entity: "students",
      entityId: row.id,
      newData: { full_name: row.full_name, academic_year: row.academic_year },
    });
    revalidatePath("/students");
    return succeed(`Perubahan data ${row.full_name} sudah tersimpan.`);
  } catch (error) {
    console.error("updateStudentAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
  }
}

/** Hapus 1 siswa. */
export async function deleteStudentAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const id = formData.get("studentId");
  const idParsed = studentIdSchema.safeParse(id);
  if (!idParsed.success) return fail("Data siswa tidak valid");

  try {
    await deleteStudent(idParsed.data);
    await logAuditEvent({
      action: "delete",
      entity: "students",
      entityId: idParsed.data,
    });
    revalidatePath("/students");
    return succeed("Data siswa sudah dihapus.");
  } catch (error) {
    console.error("deleteStudentAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menghapus data siswa");
  }
}

/**
 * Daftar kelas tahun asal untuk panel kenaikan kelas.
 * Dipanggil langsung dari browser (bukan lewat form).
 */
export async function getPromoteClassesAction(
  sourceYear: string
): Promise<{ ok: boolean; error: string | null; classes: PromotePreview }> {
  const yearParsed = academicYearSchema.safeParse(sourceYear);
  if (!yearParsed.success) {
    return { ok: false, error: "Tahun ajaran tidak valid", classes: [] };
  }
  try {
    const user = await requireUser();
    if (!user.schoolId) {
      return { ok: false, error: "Akun Anda belum terhubung ke sekolah", classes: [] };
    }
    const classes = await getPromotePreview(yearParsed.data);
    return { ok: true, error: null, classes };
  } catch (error) {
    console.error("getPromoteClassesAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal memuat daftar kelas",
      classes: [],
    };
  }
}

/** Proses kenaikan kelas sesuai peta yang diisi pengguna. */
export async function promoteStudentsAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const parsed = studentPromoteSchema.safeParse({
    sourceYear: formData.get("sourceYear"),
    targetYear: formData.get("targetYear"),
    mappingsJson: formData.get("mappingsJson"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const outcome = await promoteStudents({
      sourceYear: parsed.data.sourceYear,
      targetYear: parsed.data.targetYear,
      mappings: parsed.data.mappingsJson.map((m) => ({
        fromClass: m.fromClass || null,
        toClass: m.toClass || null,
        graduate: m.graduate,
      })),
    });
    await logAuditEvent({
      action: "promote",
      entity: "students",
      newData: {
        source_year: parsed.data.sourceYear,
        target_year: parsed.data.targetYear,
        moved: outcome.moved,
        graduated: outcome.graduated,
        skipped: outcome.skipped,
      },
    });
    revalidatePath("/students");

    const parts = [];
    if (outcome.moved > 0)
      parts.push(`Naik kelas: ${outcome.moved} siswa ke tahun ${parsed.data.targetYear}`);
    if (outcome.graduated > 0) parts.push(`Lulus: ${outcome.graduated} siswa`);
    if (outcome.skipped > 0) parts.push(`Dilewati (sudah ada): ${outcome.skipped}`);
    if (parts.length === 0) {
      return fail(
        `Tidak ada siswa aktif pada tahun ${parsed.data.sourceYear} untuk diproses`
      );
    }
    return succeed(`${parts.join(". ")}.`);
  } catch (error) {
    console.error("promoteStudentsAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal memproses kenaikan kelas");
  }
}

/** Tetapkan / kosongkan wali kelas (Kepala Sekolah). */
export async function assignHomeroomAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const parsed = assignHomeroomSchema.safeParse({
    teacherId: formData.get("teacherId"),
    className: formData.get("className"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    await assignHomeroom(parsed.data.teacherId ?? null, parsed.data.className);
    revalidatePath("/students");
    return succeed(
      parsed.data.teacherId
        ? `Wali kelas ${parsed.data.className} sudah ditetapkan.`
        : `Wali kelas ${parsed.data.className} dikosongkan.`
    );
  } catch (error) {
    console.error("assignHomeroomAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengatur wali kelas");
  }
}

/** Simpan absensi satu kelas satu tanggal (wali kelas / guru mapel). */
export async function saveAttendanceAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const parsed = saveAttendanceSchema.safeParse({
    academicYear: formData.get("academicYear"),
    className: formData.get("className"),
    date: formData.get("date"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const result = await saveAttendance({
      academicYear: parsed.data.academicYear,
      className: parsed.data.className,
      date: parsed.data.date,
      items: parsed.data.itemsJson,
    });
    await logAuditEvent({
      action: "save",
      entity: "class_attendance",
      newData: {
        class_name: parsed.data.className,
        academic_year: parsed.data.academicYear,
        date: parsed.data.date,
        saved: result.saved,
      },
    });
    revalidatePath("/students");
    const c = result.counts;
    return succeed(
      `Absensi tersimpan: ${c.hadir} hadir, ${c.izin} izin, ${c.sakit} sakit, ${c.alpa} alpa.`
    );
  } catch (error) {
    console.error("saveAttendanceAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan absensi");
  }
}

/** Simpan daftar "kelas yang saya ajar" (akun guru). */
export async function saveMyAssignmentsAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const user = await requireUser();
  if (!user.schoolId) return fail("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "teacher") return fail("Halaman ini untuk akun guru");

  const parsed = saveMyAssignmentsSchema.safeParse({
    academicYear: formData.get("academicYear"),
    itemsJson: formData.get("itemsJson"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const result = await saveMyAssignments(
      parsed.data.itemsJson,
      parsed.data.academicYear
    );
    revalidatePath("/students/absensi/rekap");
    return succeed(`${result.saved} kelas tersimpan.`);
  } catch (error) {
    console.error("saveMyAssignmentsAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan daftar kelas");
  }
}

function revalidateStudents() {
  revalidatePath("/students");
}

async function requireClassManager(): Promise<string | null> {
  const user = await requireUser();
  if (!user.schoolId) return "Akun Anda belum terhubung ke sekolah";
  if (user.role !== "principal" && user.role !== "admin") {
    return "Hanya Kepala Sekolah yang dapat mengatur daftar kelas";
  }
  return null;
}

/** Tambah 1 kelas ke daftar (Kepala Sekolah). */
export async function createSchoolClassAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireClassManager();
  if (blocked) return fail(blocked);
  const parsed = createSchoolClassSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(firstClassIssueMessage(parsed.error));
  try {
    const row = await createSchoolClass(parsed.data.name);
    await logAuditEvent({
      action: "create",
      entity: "school_classes",
      entityId: row.id,
      newData: { name: row.name },
    });
    revalidateStudents();
    return succeed(`Kelas ${row.name} masuk daftar.`);
  } catch (error) {
    console.error("createSchoolClassAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menambah kelas");
  }
}

/** Ubah nama kelas (Kepala Sekolah). Data lama tetap apa adanya. */
export async function renameSchoolClassAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireClassManager();
  if (blocked) return fail(blocked);
  const parsed = renameSchoolClassSchema.safeParse({
    classId: formData.get("classId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return fail(firstClassIssueMessage(parsed.error));
  try {
    const row = await renameSchoolClass(parsed.data.classId, parsed.data.name);
    await logAuditEvent({
      action: "update",
      entity: "school_classes",
      entityId: row.id,
      newData: { name: row.name },
    });
    revalidateStudents();
    return succeed(`Nama kelas diubah menjadi ${row.name}.`);
  } catch (error) {
    console.error("renameSchoolClassAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengubah nama kelas");
  }
}

/** Aktif/nonaktif kelas dari dropdown (Kepala Sekolah). */
export async function setSchoolClassActiveAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireClassManager();
  if (blocked) return fail(blocked);
  const parsed = setSchoolClassActiveSchema.safeParse({
    classId: formData.get("classId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) return fail(firstClassIssueMessage(parsed.error));
  try {
    await setSchoolClassActive(parsed.data.classId, parsed.data.isActive);
    await logAuditEvent({
      action: "update",
      entity: "school_classes",
      entityId: parsed.data.classId,
      newData: { is_active: parsed.data.isActive },
    });
    revalidateStudents();
    return succeed(
      parsed.data.isActive ? "Kelas diaktifkan kembali." : "Kelas dinonaktifkan (tidak muncul di pilihan)."
    );
  } catch (error) {
    console.error("setSchoolClassActiveAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengubah status kelas");
  }
}

/** Hapus kelas yang tidak dipakai (Kepala Sekolah). */
export async function deleteSchoolClassAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireClassManager();
  if (blocked) return fail(blocked);
  const parsed = schoolClassIdSchema.safeParse({ classId: formData.get("classId") });
  if (!parsed.success) return fail(firstClassIssueMessage(parsed.error));
  try {
    await deleteSchoolClass(parsed.data.classId);
    await logAuditEvent({
      action: "delete",
      entity: "school_classes",
      entityId: parsed.data.classId,
    });
    revalidateStudents();
    return succeed("Kelas dihapus dari daftar.");
  } catch (error) {
    console.error("deleteSchoolClassAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menghapus kelas");
  }
}

/**
 * Hapus massal siswa per kelas dalam 1 tahun ajaran (Kepala Sekolah).
 * Server menghitung ulang jumlah dan menolak bila berubah —
 * pengaman terakhir bila layar sudah basi.
 */
export async function bulkDeleteStudentsAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const parsed = bulkDeleteStudentsSchema.safeParse({
    academicYear: formData.get("academicYear"),
    classesJson: formData.get("classesJson"),
    expectedTotal: formData.get("expectedTotal"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const outcome = await bulkDeleteStudents({
      academicYear: parsed.data.academicYear,
      classNames: parsed.data.classesJson,
      expectedTotal: parsed.data.expectedTotal,
    });
    await logAuditEvent({
      action: "bulk_delete",
      entity: "students",
      newData: {
        academic_year: parsed.data.academicYear,
        classes: outcome.classes,
        deleted: outcome.deleted,
      },
    });
    revalidatePath("/students");
    return succeed(
      `${outcome.deleted} siswa dari ${outcome.classes.length} kelas (tahun ${parsed.data.academicYear}) sudah dihapus permanen.`
    );
  } catch (error) {
    console.error("bulkDeleteStudentsAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal menghapus data");
  }
}

/** Import banyak siswa dari hasil preview (sudah divalidasi di browser). */
export async function importStudentsAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const blocked = await requireStudentAccess();
  if (blocked) return fail(blocked);

  const parsed = studentImportSchema.safeParse({
    academicYear: formData.get("academicYear"),
    rowsJson: formData.get("rowsJson"),
  });
  if (!parsed.success) return fail(firstStudentIssueMessage(parsed.error));

  try {
    const outcome = await importStudents(parsed.data.rowsJson, parsed.data.academicYear);
    await logAuditEvent({
      action: "import",
      entity: "students",
      newData: {
        academic_year: parsed.data.academicYear,
        inserted: outcome.inserted,
        skipped: outcome.skipped,
        failed: outcome.failed.length,
      },
    });
    revalidatePath("/students");

    const parts = [`Masuk: ${outcome.inserted} siswa`];
    if (outcome.skipped > 0) parts.push(`Dilewati (sudah ada): ${outcome.skipped}`);
    if (outcome.failed.length > 0) {
      parts.push(`Gagal: ${outcome.failed.length}`);
      const sample = outcome.failed
        .slice(0, 3)
        .map((f) => `${f.name}: ${f.message}`)
        .join("; ");
      return {
        ok: outcome.inserted > 0,
        error: outcome.inserted > 0 ? null : `Semua baris gagal masuk. ${sample}`,
        message: `${parts.join(". ")}. ${sample}`,
      };
    }
    return succeed(`${parts.join(". ")}.`);
  } catch (error) {
    console.error("importStudentsAction error:", error);
    return fail(error instanceof Error ? error.message : "Gagal mengimport data");
  }
}
