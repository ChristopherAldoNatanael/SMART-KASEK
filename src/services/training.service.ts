"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getOwnTeacherId } from "./teacher.service";
import type { Database } from "@/types/database";

type Training = Database["public"]["Tables"]["trainings"]["Row"];
type Participant = Database["public"]["Tables"]["training_participants"]["Row"];

export type TrainingParticipantWithTeacher = Participant & {
  teacherName: string;
};

export type TrainingWithParticipants = Training & {
  participants: TrainingParticipantWithTeacher[];
  participantCount: number;
};

export type TeacherTrainingRecap = {
  teacherId: string;
  name: string;
  subject: string | null;
  certificationStatus: string;
  certificationType: string | null;
  trainingCount: number;
  totalPoints: number;
};

export type TeacherTrainingHistoryItem = {
  trainingId: string;
  name: string;
  organizer: string | null;
  trainingDate: string | null;
  scheduleTime: string | null;
  location: string | null;
  durationHours: number | null;
  points: number;
};

/**
 * Kalau tabel trainings belum ada (migrasi 00039 belum jalan),
 * jelaskan dengan bahasa biasa + cara betulin, bukan error mentah.
 */
function friendlyDbError(error: unknown, fallback: string): Error {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (
    (/trainings|training_participants/i.test(msg) && /does not exist/i.test(msg)) ||
    (/certification_/i.test(msg) && /does not exist/i.test(msg))
  ) {
    return new Error(
      "Database belum diperbarui. Buka Supabase → SQL Editor → jalankan isi file supabase/migrations/00039_teacher_certification_and_trainings.sql, lalu muat ulang halaman ini."
    );
  }
  if (/row-level security|policy|permission denied/i.test(msg)) {
    return new Error(
      "Tidak diizinkan. Pastikan migration terbaru sudah dijalankan, lalu coba lagi."
    );
  }
  return new Error(msg || fallback);
}

async function requireTrainingManager(): Promise<{ schoolId: string; userId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  // Khusus Kepala Sekolah. Guru tidak mengelola pelatihan —
  // mereka hanya melihat rekap/riwayat miliknya sendiri.
  if (!hasRole(user.role, "principal")) {
    throw new Error("Hanya Kepala Sekolah yang dapat mengelola pelatihan");
  }
  return { schoolId: user.schoolId, userId: user.id };
}

/** Nama guru dari join profile (object atau array versi Supabase). */
function teacherDisplayName(row: { profile: unknown }): string {
  const p = row.profile;
  if (Array.isArray(p)) {
    const first = p[0] as { full_name?: string | null } | undefined;
    return first?.full_name ?? "Tanpa nama";
  }
  return (p as { full_name?: string | null } | null)?.full_name ?? "Tanpa nama";
}

/** Pastikan semua teacherId milik sekolah yang sama. */
async function assertTeachersInSchool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  teacherIds: string[]
): Promise<void> {
  const unique = Array.from(new Set(teacherIds));
  const { data, error } = await supabase
    .from("teachers")
    .select("id")
    .eq("school_id", schoolId)
    .in("id", unique);
  if (error) throw friendlyDbError(error, "Gagal memeriksa data guru");
  if ((data ?? []).length !== unique.length) {
    throw new Error("Sebagian guru peserta tidak ditemukan di sekolah ini");
  }
}

async function loadOwnedTraining(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  trainingId: string
): Promise<Training> {
  const { data, error } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", trainingId)
    .single();
  if (error || !data) throw new Error("Pelatihan tidak ditemukan");
  const row = data as Training;
  if (row.school_id !== schoolId) {
    throw new Error("Anda tidak memiliki akses ke pelatihan ini");
  }
  return row;
}

function toWithParticipants(
  training: Training,
  participants: Participant[],
  nameByTeacherId: Map<string, string>
): TrainingWithParticipants {
  const list = (participants ?? [])
    .filter((p) => p.training_id === training.id)
    .map((p) => ({
      ...p,
      teacherName: nameByTeacherId.get(p.teacher_id) ?? "Tanpa nama",
    }));
  return { ...training, participants: list, participantCount: list.length };
}

/** Daftar pelatihan satu sekolah + peserta (urut tanggal terbaru). */
export async function listTrainings(): Promise<TrainingWithParticipants[]> {
  const { schoolId } = await requireTrainingManager();
  const supabase = await createClient();

  const { data: trainings, error } = await supabase
    .from("trainings")
    .select("*")
    .eq("school_id", schoolId)
    .order("training_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw friendlyDbError(error, "Gagal memuat pelatihan");
  const rows = (trainings ?? []) as Training[];
  if (rows.length === 0) return [];

  const { data: participants, error: pError } = await supabase
    .from("training_participants")
    .select("*")
    .in(
      "training_id",
      rows.map((t) => t.id)
    );
  if (pError) throw friendlyDbError(pError, "Gagal memuat peserta");

  const teacherIds = Array.from(
    new Set((participants ?? []).map((p) => (p as Participant).teacher_id))
  );
  const nameByTeacherId = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, profile:profiles(full_name)")
      .in("id", teacherIds);
    for (const t of ((teachers ?? []) as unknown as { id: string; profile: unknown }[])) {
      nameByTeacherId.set(t.id, teacherDisplayName(t));
    }
  }

  return rows.map((t) =>
    toWithParticipants(t, (participants ?? []) as Participant[], nameByTeacherId)
  );
}

/** Satu pelatihan milik sekolah + pesertanya (untuk form ubah). */
export async function getTrainingById(
  trainingId: string
): Promise<TrainingWithParticipants> {
  const { schoolId } = await requireTrainingManager();
  const supabase = await createClient();
  const training = await loadOwnedTraining(supabase, schoolId, trainingId);

  const { data: participants, error } = await supabase
    .from("training_participants")
    .select("*")
    .eq("training_id", trainingId);
  if (error) throw friendlyDbError(error, "Gagal memuat peserta");

  const list = (participants ?? []) as Participant[];
  const nameByTeacherId = new Map<string, string>();
  if (list.length > 0) {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, profile:profiles(full_name)")
      .in(
        "id",
        list.map((p) => p.teacher_id)
      );
    for (const t of ((teachers ?? []) as unknown as { id: string; profile: unknown }[])) {
      nameByTeacherId.set(t.id, teacherDisplayName(t));
    }
  }

  return toWithParticipants(training, list, nameByTeacherId);
}

export type SaveTrainingInput = {
  name: string;
  description?: string;
  organizer?: string;
  trainingDate?: string;
  scheduleTime?: string;
  location?: string;
  durationHours?: number;
  points: number;
  teacherIds: string[];
};

/** Tambah pelatihan + peserta (satu transaksi logis, validasi dulu). */
export async function createTraining(input: SaveTrainingInput): Promise<Training> {
  const { schoolId, userId } = await requireTrainingManager();
  const supabase = await createClient();
  await assertTeachersInSchool(supabase, schoolId, input.teacherIds);

  const { data, error } = await supabase
    .from("trainings")
    .insert({
      school_id: schoolId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      organizer: input.organizer?.trim() || null,
      training_date: input.trainingDate ?? null,
      schedule_time: input.scheduleTime?.trim() || null,
      location: input.location?.trim() || null,
      duration_hours: input.durationHours ?? null,
      points: input.points,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) throw friendlyDbError(error, "Gagal menambah pelatihan");
  const training = data as Training;

  const { error: pError } = await supabase.from("training_participants").insert(
    Array.from(new Set(input.teacherIds)).map((teacher_id) => ({
      training_id: training.id,
      teacher_id,
    }))
  );
  if (pError) {
    // Rollback manual: kegiatan tanpa peserta valid lebih baik dibuang
    // daripada yatim (rekap menghitung dari relasi peserta).
    await supabase.from("trainings").delete().eq("id", training.id);
    throw friendlyDbError(pError, "Gagal menyimpan peserta pelatihan");
  }
  return training;
}

/** Ubah pelatihan + sinkronisasi peserta (ganti penuh, idempotent). */
export async function updateTraining(
  trainingId: string,
  input: SaveTrainingInput
): Promise<Training> {
  const { schoolId } = await requireTrainingManager();
  const supabase = await createClient();
  await loadOwnedTraining(supabase, schoolId, trainingId);
  await assertTeachersInSchool(supabase, schoolId, input.teacherIds);

  const { data, error } = await supabase
    .from("trainings")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      organizer: input.organizer?.trim() || null,
      training_date: input.trainingDate ?? null,
      schedule_time: input.scheduleTime?.trim() || null,
      location: input.location?.trim() || null,
      duration_hours: input.durationHours ?? null,
      points: input.points,
    })
    .eq("id", trainingId)
    .select("*")
    .single();
  if (error || !data) throw friendlyDbError(error, "Gagal menyimpan perubahan");

  const { error: delError } = await supabase
    .from("training_participants")
    .delete()
    .eq("training_id", trainingId);
  if (delError) throw friendlyDbError(delError, "Gagal menyimpan peserta");

  const { error: pError } = await supabase.from("training_participants").insert(
    Array.from(new Set(input.teacherIds)).map((teacher_id) => ({
      training_id: trainingId,
      teacher_id,
    }))
  );
  if (pError) throw friendlyDbError(pError, "Gagal menyimpan peserta");

  return data as Training;
}

/** Hapus permanen (peserta ikut terhapus via CASCADE). */
export async function deleteTraining(trainingId: string): Promise<{ name: string }> {
  const { schoolId } = await requireTrainingManager();
  const supabase = await createClient();
  const row = await loadOwnedTraining(supabase, schoolId, trainingId);
  const { error } = await supabase.from("trainings").delete().eq("id", trainingId);
  if (error) throw friendlyDbError(error, "Gagal menghapus pelatihan");
  return { name: row.name };
}

/**
 * Rekap per guru: sertifikasi + jumlah pelatihan + total poin.
 * Dihitung dari database (COUNT + SUM), tanpa angka hardcode.
 */
export async function getTrainingRecap(): Promise<TeacherTrainingRecap[]> {
  const { schoolId } = await requireTrainingManager();
  const supabase = await createClient();

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select(
      "id, subject, certification_status, certification_type, profile:profiles(full_name)"
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });
  if (error) throw friendlyDbError(error, "Gagal memuat rekap pelatihan");
  if (!teachers || teachers.length === 0) return [];

  const teacherIds = (teachers as { id: string }[]).map((t) => t.id);

  const { data: trainings, error: tError } = await supabase
    .from("trainings")
    .select("id, points")
    .eq("school_id", schoolId);
  if (tError) throw friendlyDbError(tError, "Gagal memuat rekap pelatihan");
  const pointsByTraining = new Map(
    ((trainings ?? []) as { id: string; points: number }[]).map((t) => [t.id, t.points ?? 0])
  );

  const { data: participants, error: pError } = await supabase
    .from("training_participants")
    .select("training_id, teacher_id")
    .in("teacher_id", teacherIds);
  if (pError) throw friendlyDbError(pError, "Gagal memuat rekap pelatihan");

  const countByTeacher = new Map<string, number>();
  const pointsTotalByTeacher = new Map<string, number>();
  for (const p of (participants ?? []) as { training_id: string; teacher_id: string }[]) {
    // Abaikan peserta yang pelatihannya sudah dihapus / beda sekolah.
    if (!pointsByTraining.has(p.training_id)) continue;
    countByTeacher.set(p.teacher_id, (countByTeacher.get(p.teacher_id) ?? 0) + 1);
    pointsTotalByTeacher.set(
      p.teacher_id,
      (pointsTotalByTeacher.get(p.teacher_id) ?? 0) + (pointsByTraining.get(p.training_id) ?? 0)
    );
  }

  return (
    teachers as unknown as {
      id: string;
      subject: string | null;
      certification_status: string;
      certification_type: string | null;
      profile: unknown;
    }[]
  ).map((t) => ({
    teacherId: t.id,
    name: teacherDisplayName(t),
    subject: t.subject,
    certificationStatus: t.certification_status ?? "belum",
    certificationType: t.certification_type,
    trainingCount: countByTeacher.get(t.id) ?? 0,
    totalPoints: pointsTotalByTeacher.get(t.id) ?? 0,
  }));
}

/**
 * Riwayat pelatihan satu guru (untuk detail guru, Kepala Sekolah).
 * Verifikasi keanggotaan sekolah dulu — guru lintas sekolah ditolak.
 */
export async function getTeacherTrainings(
  teacherId: string
): Promise<{ recap: { trainingCount: number; totalPoints: number }; history: TeacherTrainingHistoryItem[] }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  if (!hasRole(user.role, "principal")) {
    throw new Error("Hanya Kepala Sekolah yang dapat melihat riwayat ini");
  }

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("school_id", user.schoolId)
    .single();
  if (!teacher) throw new Error("Guru tidak ditemukan");

  const { data: parts, error } = await supabase
    .from("training_participants")
    .select("training_id")
    .eq("teacher_id", teacherId);
  if (error) throw friendlyDbError(error, "Gagal memuat riwayat pelatihan");

  const trainingIds = ((parts ?? []) as { training_id: string }[]).map((p) => p.training_id);
  if (trainingIds.length === 0) {
    return { recap: { trainingCount: 0, totalPoints: 0 }, history: [] };
  }

  const { data: trainings, error: tError } = await supabase
    .from("trainings")
    .select(
      "id, name, organizer, training_date, schedule_time, location, duration_hours, points"
    )
    .eq("school_id", user.schoolId)
    .in("id", trainingIds)
    .order("training_date", { ascending: false, nullsFirst: false });
  if (tError) throw friendlyDbError(tError, "Gagal memuat riwayat pelatihan");

  const history = ((trainings ?? []) as {
    id: string;
    name: string;
    organizer: string | null;
    training_date: string | null;
    schedule_time: string | null;
    location: string | null;
    duration_hours: number | null;
    points: number;
  }[]).map((t) => ({
    trainingId: t.id,
    name: t.name,
    organizer: t.organizer,
    trainingDate: t.training_date,
    scheduleTime: t.schedule_time,
    location: t.location,
    durationHours: t.duration_hours,
    points: t.points ?? 0,
  }));

  return {
    recap: {
      trainingCount: history.length,
      totalPoints: history.reduce((sum, h) => sum + (h.points ?? 0), 0),
    },
    history,
  };
}

/**
 * Riwayat pelatihan milik guru yang login — own-only (seperti
 * getMyGrowthData): filter teacher_id milik akun, bukan RLS saja.
 */
export async function getMyTrainings(): Promise<TeacherTrainingHistoryItem[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];

  const ownId = await getOwnTeacherId(user.id, user.schoolId);
  if (!ownId) return [];

  const supabase = await createClient();
  const { data: parts, error } = await supabase
    .from("training_participants")
    .select("training_id")
    .eq("teacher_id", ownId);
  if (error) throw friendlyDbError(error, "Gagal memuat riwayat pelatihan");

  const trainingIds = ((parts ?? []) as { training_id: string }[]).map((p) => p.training_id);
  if (trainingIds.length === 0) return [];

  const { data: trainings, error: tError } = await supabase
    .from("trainings")
    .select(
      "id, name, organizer, training_date, schedule_time, location, duration_hours, points"
    )
    .eq("school_id", user.schoolId)
    .in("id", trainingIds)
    .order("training_date", { ascending: false, nullsFirst: false });
  if (tError) throw friendlyDbError(tError, "Gagal memuat riwayat pelatihan");

  return ((trainings ?? []) as {
    id: string;
    name: string;
    organizer: string | null;
    training_date: string | null;
    schedule_time: string | null;
    location: string | null;
    duration_hours: number | null;
    points: number;
  }[]).map((t) => ({
    trainingId: t.id,
    name: t.name,
    organizer: t.organizer,
    trainingDate: t.training_date,
    scheduleTime: t.schedule_time,
    location: t.location,
    durationHours: t.duration_hours,
    points: t.points ?? 0,
  }));
}
