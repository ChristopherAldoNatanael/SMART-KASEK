"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import { academicYearDateRange } from "@/lib/promotion";
import {
  currentAcademicYear,
  nextAcademicYear,
  yearAfter,
} from "@/lib/students";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];
type PromotionRow = Database["public"]["Tables"]["promotion_decisions"]["Row"];
type Attendance = Database["public"]["Tables"]["class_attendance"]["Row"];

export type AttendanceTotals = {
  hadir: number;
  /** Terlambat dihitung sebagai kehadiran (hadir + terlambat). */
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
};

export type BoardStudent = Pick<
  Student,
  "id" | "full_name" | "student_number" | "status"
> & {
  decision: PromotionRow | null;
  attendance: AttendanceTotals;
};

const NOTE_REQUIRED_FOR: string[] = ["tidak_naik", "pertimbangan"];

async function requireSchoolUser(): Promise<CurrentUser & { schoolId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  return user as CurrentUser & { schoolId: string };
}

function requirePrincipalRole(user: CurrentUser): void {
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat melakukan ini");
  }
}

/** Wali kelas yang login + kelas yang diampunya. */
async function requireHomeroom(): Promise<{
  schoolId: string;
  teacherId: string;
  homeroom: string;
}> {
  const user = await requireSchoolUser();
  if (user.role !== "teacher") {
    throw new Error("Halaman ini untuk wali kelas");
  }
  const supabase = await createClient();
  const teacherId = await getOwnTeacherId(user.id, user.schoolId);
  if (!teacherId) throw new Error("Akun Anda belum terhubung ke data guru");
  const { data } = await supabase
    .from("teachers")
    .select("homeroom_class")
    .eq("id", teacherId)
    .eq("school_id", user.schoolId)
    .single();
  const homeroom = (
    (data as { homeroom_class?: string | null } | null)?.homeroom_class ?? ""
  ).trim();
  if (!homeroom) {
    throw new Error(
      "Anda belum ditetapkan sebagai wali kelas. Hubungi Kepala Sekolah."
    );
  }
  return { schoolId: user.schoolId, teacherId, homeroom };
}

async function resolveStudent(
  studentId: string,
  schoolId: string,
  academicYear: string
): Promise<Student> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .single();
  if (error || !data) throw new Error("Data siswa tidak ditemukan");
  const row = data as Student;
  const year = (row.academic_year ?? "").trim() || currentAcademicYear();
  if (year !== academicYear) {
    throw new Error("Siswa tidak pada tahun pelajaran tersebut");
  }
  return row;
}

async function getDecisionByStudent(
  studentId: string,
  academicYear: string
): Promise<PromotionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("promotion_decisions")
    .select("*")
    .eq("student_id", studentId)
    .eq("academic_year", academicYear)
    .maybeSingle();
  return (data as PromotionRow | null) ?? null;
}

async function attendanceByStudent(
  schoolId: string,
  academicYear: string
): Promise<Map<string, AttendanceTotals>> {
  const range = academicYearDateRange(academicYear);
  const map = new Map<string, AttendanceTotals>();
  if (!range) return map;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_attendance")
    .select("student_id, status")
    .eq("school_id", schoolId)
    .gte("date", range.from)
    .lte("date", range.to);
  if (error) throw new Error(error.message);
  for (const r of (data ?? []) as Pick<Attendance, "student_id" | "status">[]) {
    const t = map.get(r.student_id) ?? {
      hadir: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
    };
    if (r.status === "hadir") t.hadir++;
    else if (r.status === "terlambat") t.terlambat++;
    else if (r.status === "izin") t.izin++;
    else if (r.status === "sakit") t.sakit++;
    else if (r.status === "alpa") t.alpa++;
    map.set(r.student_id, t);
  }
  return map;
}

/* --------------------------------- Query -------------------------------- */

/** Papan Kelas Saya untuk wali kelas (roster + rekomendasi + kehadiran). */
export async function getPromotionBoard(academicYear: string): Promise<{
  className: string;
  students: BoardStudent[];
  progress: { reviewed: number; submitted: number; total: number };
}> {
  const { schoolId, homeroom } = await requireHomeroom();
  const supabase = await createClient();
  const [{ data: students, error: sError }, { data: decisions, error: dError }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, student_number, status, class_name, academic_year")
        .eq("school_id", schoolId)
        .order("full_name", { ascending: true }),
      supabase
        .from("promotion_decisions")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .eq("class_name", homeroom),
    ]);
  if (sError) throw new Error(sError.message);
  if (dError) throw new Error(dError.message);

  const roster = ((students ?? []) as Student[]).filter(
    (s) =>
      ((s.academic_year ?? "").trim() || currentAcademicYear()) === academicYear &&
      (s.class_name ?? "").trim() === homeroom &&
      s.status === "active"
  );
  const byStudent = new Map(
    ((decisions ?? []) as PromotionRow[]).map((d) => [d.student_id, d])
  );
  const attendance = await attendanceByStudent(schoolId, academicYear);

  const list: BoardStudent[] = roster.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    student_number: s.student_number,
    status: s.status,
    decision: byStudent.get(s.id) ?? null,
    attendance: attendance.get(s.id) ?? {
      hadir: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
    },
  }));

  return {
    className: homeroom,
    students: list,
    progress: {
      reviewed: list.filter((s) => s.decision?.recommendation).length,
      submitted: list.filter((s) => s.decision?.status === "submitted").length,
      total: list.length,
    },
  };
}

export type QueueItem = {
  decision: PromotionRow;
  studentName: string;
  studentNumber: string | null;
  recommenderName: string | null;
};

/** Antrian verifikasi untuk Kepala Sekolah. */
export async function getPromotionQueue(academicYear: string): Promise<QueueItem[]> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_decisions")
    .select(
      "*, student:students(full_name, student_number), recommender:profiles!promotion_decisions_recommended_by_fkey(full_name)"
    )
    .eq("school_id", user.schoolId)
    .eq("academic_year", academicYear)
    .eq("status", "submitted")
    .order("recommended_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as (PromotionRow & {
    student: { full_name: string; student_number: string | null } | null;
    recommender: { full_name: string | null } | null;
  })[]).map((d) => ({
    decision: d as PromotionRow,
    studentName: d.student?.full_name ?? "—",
    studentNumber: d.student?.student_number ?? null,
    recommenderName: d.recommender?.full_name ?? null,
  }));
}

export type HistoryItem = {
  decision: PromotionRow;
  studentName: string;
  deciderName: string | null;
};

/** Riwayat keputusan final per tahun (kepsek semua kelas, wali kelasnya). */
export async function getPromotionHistory(academicYear: string): Promise<HistoryItem[]> {
  const user = await requireSchoolUser();
  const supabase = await createClient();
  let homeroom: string | null = null;
  if (user.role === "teacher") {
    homeroom = (await requireHomeroom()).homeroom;
  } else {
    requirePrincipalRole(user);
  }

  let query = supabase
    .from("promotion_decisions")
    .select(
      "*, student:students(full_name), decider:profiles!promotion_decisions_decided_by_fkey(full_name)"
    )
    .eq("school_id", user.schoolId)
    .eq("academic_year", academicYear)
    .eq("status", "decided")
    .order("decided_at", { ascending: false });
  if (homeroom) query = query.eq("class_name", homeroom);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as (PromotionRow & {
    student: { full_name: string } | null;
    decider: { full_name: string | null } | null;
  })[]).map((d) => ({
    decision: d as PromotionRow,
    studentName: d.student?.full_name ?? "—",
    deciderName: d.decider?.full_name ?? null,
  }));
}

/** Ringkasan angka per tahun untuk overview & dashboard. */
export async function getPromotionStats(academicYear: string): Promise<{
  years: string[];
  total: number;
  reviewed: number;
  submitted: number;
  decided: number;
  decidedNaik: number;
  decidedTidak: number;
}> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  const supabase = await createClient();
  const [{ data: students }, { data: decisions }] = await Promise.all([
    supabase
      .from("students")
      .select("id, academic_year, status")
      .eq("school_id", user.schoolId),
    supabase
      .from("promotion_decisions")
      .select("student_id, academic_year, status, recommendation, final_decision")
      .eq("school_id", user.schoolId),
  ]);
  const sRows = (students ?? []) as Pick<Student, "id" | "academic_year" | "status">[];
  const dRows = (decisions ?? []) as Pick<
    PromotionRow,
    "student_id" | "academic_year" | "status" | "recommendation" | "final_decision"
  >[];

  const yearSet = new Set<string>();
  for (const s of sRows) yearSet.add((s.academic_year ?? "").trim() || currentAcademicYear());
  for (const d of dRows) yearSet.add(d.academic_year);
  yearSet.add(currentAcademicYear());
  const years = Array.from(yearSet).sort((a, b) => (a < b ? 1 : -1));

  const activeIds = new Set(
    sRows
      .filter(
        (s) =>
          ((s.academic_year ?? "").trim() || currentAcademicYear()) === academicYear &&
          s.status === "active"
      )
      .map((s) => s.id)
  );
  const inYear = dRows.filter((d) => d.academic_year === academicYear);
  return {
    years,
    total: activeIds.size,
    reviewed: inYear.filter((d) => d.recommendation && activeIds.has(d.student_id)).length,
    submitted: inYear.filter((d) => d.status === "submitted").length,
    decided: inYear.filter((d) => d.status === "decided").length,
    decidedNaik: inYear.filter(
      (d) => d.status === "decided" && d.final_decision === "naik"
    ).length,
    decidedTidak: inYear.filter(
      (d) => d.status === "decided" && d.final_decision === "tidak_naik"
    ).length,
  };
}

export type PromotionDetail = {
  student: Student;
  decision: PromotionRow | null;
  attendance: AttendanceTotals & { total: number };
  subjects: string[];
  homeroomName: string | null;
  canRecommend: boolean;
  canDecide: boolean;
};

/** Detail 1 siswa: identitas, kehadiran, mapel kelas, hak aksi viewer. */
export async function getPromotionDetail(
  studentId: string,
  academicYear: string
): Promise<PromotionDetail> {
  const user = await requireSchoolUser();
  const supabase = await createClient();
  const student = await resolveStudent(studentId, user.schoolId, academicYear);
  const studentClass = (student.class_name ?? "").trim();

  let canRecommend = false;
  if (user.role === "teacher") {
    const { homeroom } = await requireHomeroom();
    if (homeroom !== studentClass) {
      throw new Error("Siswa ini bukan di kelas yang Anda wali");
    }
    canRecommend = true;
  } else {
    requirePrincipalRole(user);
  }
  const canDecide = user.role === "principal" || user.role === "admin";

  const [decision, attendanceMap, assigns, homeroomTeacher] = await Promise.all([
    getDecisionByStudent(studentId, academicYear),
    attendanceByStudent(user.schoolId, academicYear),
    supabase
      .from("teaching_assignments")
      .select("subject")
      .eq("school_id", user.schoolId)
      .eq("academic_year", academicYear)
      .eq("class_name", studentClass),
    supabase
      .from("teachers")
      .select("profile:profiles(full_name)")
      .eq("school_id", user.schoolId)
      .eq("homeroom_class", studentClass)
      .maybeSingle(),
  ]);
  const a = attendanceMap.get(studentId) ?? {
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  };
  const subjects = Array.from(
    new Set(
      ((assigns.data ?? []) as { subject: string }[]).map((r) => r.subject.trim()).filter(Boolean)
    )
  ).sort((x, y) => x.localeCompare(y, "id"));
  const homeroomName =
    ((homeroomTeacher.data as { profile: { full_name: string | null } | null } | null)?.profile
      ?.full_name ?? null) || null;

  return {
    student,
    decision,
    attendance: {
      ...a,
      total: a.hadir + a.terlambat + a.izin + a.sakit + a.alpa,
    },
    subjects,
    homeroomName,
    canRecommend,
    canDecide,
  };
}

/* --------------------------------- Mutasi ------------------------------- */

/** Simpan draft rekomendasi wali (hanya kelas sendiri, belum final). */
export async function saveRecommendation(input: {
  studentId: string;
  academicYear: string;
  recommendation: string;
  note?: string;
}): Promise<PromotionRow> {
  const { schoolId, teacherId, homeroom } = await requireHomeroom();
  const student = await resolveStudent(input.studentId, schoolId, input.academicYear);
  if ((student.class_name ?? "").trim() !== homeroom) {
    throw new Error("Siswa ini bukan di kelas yang Anda wali");
  }
  if (NOTE_REQUIRED_FOR.includes(input.recommendation) && !input.note?.trim()) {
    throw new Error("Tulis catatan dulu untuk rekomendasi ini");
  }

  const existing = await getDecisionByStudent(input.studentId, input.academicYear);
  if (existing?.status === "decided") {
    throw new Error("Keputusan sudah ditetapkan Kepala Sekolah dan tidak bisa diubah");
  }
  if (existing?.status === "submitted") {
    throw new Error("Rekomendasi sudah dikirim. Tunggu Kepala Sekolah mengembalikan bila perlu revisi.");
  }

  const supabase = await createClient();
  const payload = {
    recommendation: input.recommendation,
    recommendation_note: input.note?.trim() || null,
    homeroom_teacher_id: teacherId,
    status: "draft",
  };
  if (existing) {
    const { data, error } = await supabase
      .from("promotion_decisions")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PromotionRow;
  }
  const { data, error } = await supabase
    .from("promotion_decisions")
    .insert({
      school_id: schoolId,
      academic_year: input.academicYear,
      class_name: homeroom,
      student_id: input.studentId,
      ...payload,
    })
    .select()
    .single();
  if (error) {
    // Balapan simpan ganda (UNIQUE student+tahun): anggap sudah ada.
    if (error.code === "23505") {
      throw new Error("Data sudah tersimpan. Muat ulang halaman.");
    }
    throw new Error(error.message);
  }
  return data as PromotionRow;
}

/** Kirim semua rekomendasi draft kelas ke Kepala Sekolah. */
export async function submitClassRecommendations(
  academicYear: string,
  className: string
): Promise<{ sent: number }> {
  const { schoolId, teacherId } = await requireHomeroom();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_decisions")
    .select("id, recommendation, status")
    .eq("school_id", schoolId)
    .eq("academic_year", academicYear)
    .eq("class_name", className);
  if (error) throw new Error(error.message);
  // Hanya milik kelas wali sendiri yang bisa dikirim (walau RLS se-sekolah).
  const homeroomCheck = await supabase
    .from("teachers")
    .select("homeroom_class")
    .eq("id", teacherId)
    .single();
  const own = ((homeroomCheck.data as { homeroom_class?: string | null } | null)
    ?.homeroom_class ?? "").trim();
  if (own !== className.trim()) {
    throw new Error("Hanya kelas yang Anda wali yang bisa dikirim");
  }
  const ready = ((data ?? []) as Pick<PromotionRow, "id" | "recommendation" | "status">[]).filter(
    (d) => d.recommendation && (d.status === "draft" || d.status === "returned")
  );
  if (ready.length === 0) {
    throw new Error("Belum ada rekomendasi yang bisa dikirim. Isi dulu rekomendasi tiap siswa.");
  }
  const now = new Date().toISOString();
  const { error: upError } = await supabase
    .from("promotion_decisions")
    .update({ status: "submitted", recommended_by: teacherId, recommended_at: now })
    .in(
      "id",
      ready.map((d) => d.id)
    );
  if (upError) throw new Error(upError.message);
  return { sent: ready.length };
}

async function getOwnedDecision(decisionId: string, schoolId: string): Promise<PromotionRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_decisions")
    .select("*")
    .eq("id", decisionId)
    .eq("school_id", schoolId)
    .single();
  if (error || !data) throw new Error("Data tidak ditemukan");
  return data as PromotionRow;
}

/** Tetapkan keputusan final (Kepala Sekolah, hanya yang menunggu). */
export async function decidePromotion(input: {
  decisionId: string;
  decision: string;
  note?: string;
}): Promise<PromotionRow> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  const row = await getOwnedDecision(input.decisionId, user.schoolId);
  if (row.status !== "submitted") {
    throw new Error("Hanya yang berstatus Menunggu Verifikasi yang bisa ditetapkan");
  }
  if (!row.recommendation) {
    throw new Error("Rekomendasi wali belum ada");
  }
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotion_decisions")
    .update({
      final_decision: input.decision,
      principal_note: input.note?.trim() || null,
      decided_by: user.id,
      decided_at: now,
      status: "decided",
    })
    .eq("id", row.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PromotionRow;
}

/** Kembalikan ke wali (wajib alasan). */
export async function returnToHomeroom(input: {
  decisionId: string;
  note: string;
}): Promise<PromotionRow> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  const row = await getOwnedDecision(input.decisionId, user.schoolId);
  if (row.status !== "submitted") {
    throw new Error("Hanya yang berstatus Menunggu Verifikasi yang bisa dikembalikan");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_decisions")
    .update({ status: "returned", principal_note: input.note.trim() })
    .eq("id", row.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PromotionRow;
}

/* ------------------------------ Penerapan ------------------------------ */

export type ExecutionPreviewClass = {
  className: string;
  naikCount: number;
  undecidedCount: number;
  undecidedNames: string[];
};

export type ExecutionPreview = {
  sourceYear: string;
  targetYearDefault: string;
  yearOptions: string[];
  classes: ExecutionPreviewClass[];
  totals: { naik: number; tidak: number; undecided: number };
};

function dedupeKeyFor(
  studentNumber: string | null,
  fullName: string,
  className: string | null
): string {
  if (studentNumber) return `nis:${studentNumber.toLowerCase()}`;
  return `nama:${fullName.toLowerCase()}|${(className ?? "").toLowerCase()}`;
}

/**
 * Pratinjau penerapan: siswa Naik per kelas + yang belum ditetapkan.
 * Penerapan diblokir selama masih ada yang belum ditetapkan.
 */
export async function getExecutionPreview(
  academicYear: string
): Promise<ExecutionPreview> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  const supabase = await createClient();
  const [{ data: students, error: sError }, { data: decisions, error: dError }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, class_name, academic_year, status")
        .eq("school_id", user.schoolId)
        .order("class_name", { ascending: true })
        .order("full_name", { ascending: true }),
      supabase
        .from("promotion_decisions")
        .select("student_id, academic_year, status, final_decision")
        .eq("school_id", user.schoolId),
    ]);
  if (sError) throw new Error(sError.message);
  if (dError) throw new Error(dError.message);

  type SRow = Pick<Student, "id" | "full_name" | "class_name" | "academic_year" | "status">;
  type DRow = Pick<PromotionRow, "student_id" | "academic_year" | "status" | "final_decision">;
  const roster = ((students ?? []) as SRow[]).filter(
    (s) =>
      ((s.academic_year ?? "").trim() || currentAcademicYear()) === academicYear &&
      s.status === "active"
  );
  const decided = new Map(
    ((decisions ?? []) as DRow[])
      .filter((d) => d.academic_year === academicYear && d.status === "decided")
      .map((d) => [d.student_id, d.final_decision])
  );

  const byClass = new Map<string, { naik: number; undecided: string[] }>();
  let tidak = 0;
  for (const s of roster) {
    const cls = (s.class_name ?? "").trim();
    const g = byClass.get(cls) ?? { naik: 0, undecided: [] };
    const final = decided.get(s.id);
    if (final === "naik") g.naik++;
    else if (final === "tidak_naik") tidak++;
    else g.undecided.push(s.full_name);
    byClass.set(cls, g);
  }

  const classes: ExecutionPreviewClass[] = Array.from(byClass.entries())
    .map(([cls, g]) => ({
      className: cls,
      naikCount: g.naik,
      undecidedCount: g.undecided.length,
      undecidedNames: g.undecided.slice(0, 5),
    }))
    .sort((a, b) => a.className.localeCompare(b.className, "id"));

  const yearSet = new Set<string>();
  for (const s of (students ?? []) as SRow[]) {
    yearSet.add((s.academic_year ?? "").trim() || currentAcademicYear());
  }
  for (const d of (decisions ?? []) as DRow[]) yearSet.add(d.academic_year);
  yearSet.add(currentAcademicYear());
  yearSet.add(nextAcademicYear());

  return {
    sourceYear: academicYear,
    targetYearDefault: yearAfter(academicYear) ?? nextAcademicYear(),
    yearOptions: Array.from(yearSet)
      .filter((y) => y !== academicYear)
      .sort((a, b) => (a < b ? 1 : -1)),
    classes,
    totals: {
      naik: classes.reduce((a, c) => a + c.naikCount, 0),
      tidak,
      undecided: classes.reduce((a, c) => a + c.undecidedCount, 0),
    },
  };
}

/**
 * Terapkan keputusan: pindahkan HANYA siswa berkeputusan final Naik ke
 * tahun tujuan (kelas VI → tercatat Lulus). Yang Tidak Naik tetap.
 * Ditolak bila masih ada siswa belum ditetapkan. Aman dijalankan ulang
 * (duplikat di tahun tujuan dilewati).
 */
export async function applyPromotionDecisions(input: {
  sourceYear: string;
  targetYear: string;
  mappings: { fromClass: string; toClass: string; graduate: boolean }[];
}): Promise<{ moved: number; graduated: number; skipped: number }> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  if (input.sourceYear === input.targetYear) {
    throw new Error("Tahun asal dan tahun tujuan tidak boleh sama");
  }

  const supabase = await createClient();
  const [{ data: students, error: sError }, { data: decisions, error: dError }] =
    await Promise.all([
      supabase.from("students").select("*").eq("school_id", user.schoolId),
      supabase
        .from("promotion_decisions")
        .select("student_id, final_decision")
        .eq("school_id", user.schoolId)
        .eq("academic_year", input.sourceYear)
        .eq("status", "decided"),
    ]);
  if (sError) throw new Error(sError.message);
  if (dError) throw new Error(dError.message);

  const roster = ((students ?? []) as Student[]).filter(
    (s) =>
      ((s.academic_year ?? "").trim() || currentAcademicYear()) === input.sourceYear &&
      s.status === "active"
  );
  const finalByStudent = new Map(
    (
      decisions as Pick<PromotionRow, "student_id" | "final_decision">[]
    ).map((d) => [d.student_id, d.final_decision])
  );
  const undecided = roster.filter((s) => !finalByStudent.has(s.id));
  if (undecided.length > 0) {
    const names = undecided
      .slice(0, 5)
      .map((s) => s.full_name)
      .join(", ");
    throw new Error(
      `Masih ada ${undecided.length} siswa belum ditetapkan (${names}${undecided.length > 5 ? ", ..." : ""}). Selesaikan dulu sebelum menerapkan.`
    );
  }

  const naik = roster.filter((s) => finalByStudent.get(s.id) === "naik");
  const mapByClass = new Map(
    input.mappings.map((m) => [m.fromClass.trim().toLowerCase(), m])
  );
  for (const s of naik) {
    const key = (s.class_name ?? "").trim().toLowerCase();
    const m = mapByClass.get(key);
    if (!m || (!m.graduate && !m.toClass.trim())) {
      throw new Error(
        `Peta kelas "${(s.class_name ?? "").trim() || "Tanpa kelas"}" belum diisi`
      );
    }
  }

  const seen = new Set(
    ((students ?? []) as Student[])
      .filter(
        (s) => ((s.academic_year ?? "").trim() || currentAcademicYear()) === input.targetYear
      )
      .map((s) =>
        dedupeKeyFor(s.student_number, s.full_name, s.class_name)
      )
  );

  let moved = 0;
  let graduated = 0;
  let skipped = 0;
  const batch: Database["public"]["Tables"]["students"]["Insert"][] = [];
  async function flush(): Promise<void> {
    if (batch.length === 0) return;
    const chunk = batch.splice(0);
    const { error: insError } = await supabase.from("students").insert(chunk);
    if (insError) throw new Error(insError.message);
  }

  for (const s of naik) {
    const m = mapByClass.get((s.class_name ?? "").trim().toLowerCase());
    if (!m) continue;
    const next: Database["public"]["Tables"]["students"]["Insert"] = m.graduate
      ? {
          school_id: user.schoolId,
          full_name: s.full_name,
          student_number: s.student_number,
          no_induk: s.no_induk,
          class_name: s.class_name,
          gender: s.gender,
          religion: s.religion,
          status: "graduated",
          academic_year: input.targetYear,
        }
      : {
          school_id: user.schoolId,
          full_name: s.full_name,
          student_number: s.student_number,
          no_induk: s.no_induk,
          class_name: m.toClass.trim() || null,
          gender: s.gender,
          religion: s.religion,
          status: "active",
          academic_year: input.targetYear,
        };
    const key = dedupeKeyFor(
      next.student_number ?? null,
      next.full_name,
      next.class_name ?? null
    );
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    batch.push(next);
    if (m.graduate) graduated++;
    else moved++;
    if (batch.length >= 100) await flush();
  }
  await flush();

  return { moved, graduated, skipped };
}

/** Buka kembali keputusan final (wajib alasan, tercatat di audit). */
export async function reopenDecision(input: {
  decisionId: string;
  note: string;
}): Promise<PromotionRow> {
  const user = await requireSchoolUser();
  requirePrincipalRole(user);
  const row = await getOwnedDecision(input.decisionId, user.schoolId);
  if (row.status !== "decided") {
    throw new Error("Hanya keputusan final yang bisa dibuka kembali");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_decisions")
    .update({ status: "returned", principal_note: input.note.trim() })
    .eq("id", row.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PromotionRow;
}
