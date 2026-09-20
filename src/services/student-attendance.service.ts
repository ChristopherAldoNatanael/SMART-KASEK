"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  currentAcademicYear,
  formatWibHM,
  monthRange,
  schoolYearForMonth,
  type AttendanceStatus,
} from "@/lib/students";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Attendance = Database["public"]["Tables"]["class_attendance"]["Row"];

export type AttendanceSheetRow = {
  id: string;
  full_name: string;
  student_number: string | null;
  status: AttendanceStatus | null;
  /** Jam tercatat "HH:mm" WIB (checked_in_at QR, fallback created_at). Null = belum ada record. */
  time: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normYear(row: { academic_year?: string | null }): string {
  return row.academic_year?.trim() || currentAcademicYear();
}

async function requireAttendanceAccess(): Promise<{ schoolId: string; profileId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "principal" && user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Anda tidak memiliki akses ke absensi");
  }
  return { schoolId: user.schoolId, profileId: user.id };
}

function assertValidDate(date: string): void {
  if (!DATE_RE.test(date)) throw new Error("Tanggal tidak valid");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (date > todayStr) throw new Error("Tanggal absensi tidak boleh hari esok");
}

/**
 * Daftar siswa satu kelas + status absensi tanggal tersebut (null = belum diisi).
 */
export async function getAttendanceSheet(input: {
  academicYear: string;
  className: string;
  date: string;
  /** Batasan kelas untuk akun guru. Null = tanpa batas. */
  allowedClasses?: string[] | null;
}): Promise<{ rows: AttendanceSheetRow[]; filled: number }> {
  const { schoolId } = await requireAttendanceAccess();
  assertValidDate(input.date);
  if (input.allowedClasses && !input.allowedClasses.includes(input.className.trim())) {
    throw new Error("Anda tidak memiliki akses ke kelas ini");
  }

  const supabase = await createClient();
  const { data: students, error: sError } = await supabase
    .from("students")
    .select("id, full_name, student_number, class_name, academic_year")
    .eq("school_id", schoolId)
    .order("full_name", { ascending: true });
  if (sError) throw new Error(sError.message);

  const members = ((students ?? []) as Pick<
    Student,
    "id" | "full_name" | "student_number" | "class_name" | "academic_year"
  >[]).filter(
    (s) =>
      normYear(s) === input.academicYear &&
      (s.class_name ?? "").trim() === input.className.trim()
  );

  const { data: records, error: rError } = await supabase
    .from("class_attendance")
    .select("student_id, status, checked_in_at, created_at")
    .eq("school_id", schoolId)
    .eq("date", input.date);
  if (rError) throw new Error(rError.message);

  const byStudent = new Map(
    (
      (records ?? []) as Pick<
        Attendance,
        "student_id" | "status" | "checked_in_at" | "created_at"
      >[]
    ).map((r) => [
      r.student_id,
      {
        status: r.status as AttendanceStatus,
        time: formatWibHM(r.checked_in_at ?? r.created_at),
      },
    ])
  );

  const rows = members.map((s) => {
    const rec = byStudent.get(s.id) ?? null;
    return {
      id: s.id,
      full_name: s.full_name,
      student_number: s.student_number,
      status: rec?.status ?? null,
      time: rec?.time ?? null,
    };
  });

  return { rows, filled: rows.filter((r) => r.status !== null).length };
}

/**
 * Simpan absensi satu kelas satu tanggal. Menyimpan ulang = koreksi
 * (1 siswa 1 status per hari). Hanya siswa milik sekolah yang diproses.
 */
export async function saveAttendance(input: {
  academicYear: string;
  className: string;
  date: string;
  items: { studentId: string; status: AttendanceStatus }[];
}): Promise<{ saved: number; counts: Record<AttendanceStatus, number> }> {
  const { schoolId, profileId } = await requireAttendanceAccess();
  assertValidDate(input.date);
  if (input.items.length === 0) throw new Error("Belum ada yang ditandai");
  if (input.items.length > 500) throw new Error("Maksimal 500 siswa sekali simpan");

  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId);
  const ownedIds = new Set(((owned ?? []) as { id: string }[]).map((r) => r.id));

  const counts: Record<AttendanceStatus, number> = {
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  };
  const batch: Database["public"]["Tables"]["class_attendance"]["Insert"][] = [];
  for (const item of input.items) {
    if (!ownedIds.has(item.studentId)) continue;
    if (!["hadir", "terlambat", "izin", "sakit", "alpa"].includes(item.status))
      continue;
    batch.push({
      school_id: schoolId,
      student_id: item.studentId,
      class_name: input.className.trim() || null,
      academic_year: input.academicYear,
      date: input.date,
      status: item.status,
      recorded_by: profileId,
    });
    counts[item.status]++;
  }
  if (batch.length === 0) throw new Error("Tidak ada data valid untuk disimpan");

  const { error } = await supabase
    .from("class_attendance")
    .upsert(batch, { onConflict: "student_id,date" });
  if (error) throw new Error(error.message);

  return { saved: batch.length, counts };
}

/* --------------------------------- Rekap --------------------------------- */

export type MonthlyStudentRecap = {
  id: string;
  full_name: string;
  student_number: string | null;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  total: number;
  /** Persen kehadiran ((hadir+terlambat)/total), bilangan bulat. */
  percent: number;
};

export type MonthlyClassRecap = {
  className: string;
  days: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  total: number;
  percent: number;
  rows: MonthlyStudentRecap[];
  attention: { name: string; reason: string }[];
};

function attentionReason(r: MonthlyStudentRecap): string | null {
  if (r.total === 0) return null;
  if (r.alpa >= 3) return `Alpa ${r.alpa} kali`;
  if (r.percent < 85) return `Kehadiran ${r.percent}%`;
  return null;
}

/**
 * Rekap absensi satu bulan. Tanpa kelas = semua kelas (tampilan
 * Kepala Sekolah). Dengan kelas = rangkuman + tabel per anak.
 * Aturan "perlu perhatian" ditulis di UI: Alpa 3+ kali atau
 * kehadiran di bawah 85%.
 */
export async function getMonthlyRecap(input: {
  month: string;
  className: string | null;
  /** Batasan kelas untuk akun guru. Null = tanpa batas. */
  onlyClasses?: string[] | null;
}): Promise<{
  month: string;
  schoolYear: string;
  allClasses: string[];
  classes: MonthlyClassRecap[];
  totals: { days: number; hadir: number; terlambat: number; izin: number; sakit: number; alpa: number; total: number; percent: number };
}> {
  const { schoolId } = await requireAttendanceAccess();
  const cleanMonth = /^\d{4}-\d{2}$/.test(input.month.trim())
    ? input.month.trim()
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const { from, to } = monthRange(cleanMonth);
  const schoolYear = schoolYearForMonth(cleanMonth);
  const wanted = input.className?.trim() || null;

  const supabase = await createClient();
  const [{ data: students, error: sError }, { data: records, error: rError }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, student_number, class_name, academic_year, status")
        .eq("school_id", schoolId)
        .order("class_name", { ascending: true })
        .order("full_name", { ascending: true }),
      supabase
        .from("class_attendance")
        .select("student_id, status, date, class_name")
        .eq("school_id", schoolId)
        .gte("date", from)
        .lte("date", to),
    ]);
  if (sError) throw new Error(sError.message);
  if (rError) throw new Error(rError.message);

  type SRow = Pick<
    Student,
    "id" | "full_name" | "student_number" | "class_name" | "academic_year" | "status"
  >;
  type RRow = Pick<Attendance, "student_id" | "status" | "date" | "class_name">;
  const roster = ((students ?? []) as SRow[])
    .filter((s) => normYear(s) === schoolYear)
    .filter(
      (s) =>
        !input.onlyClasses ||
        input.onlyClasses.includes((s.class_name ?? "").trim())
    );
  const studentClass = new Map(roster.map((s) => [s.id, (s.class_name ?? "").trim()]));

  // Kelas catatan = kelas saat mencatat, fallback ke kelas siswa saat ini.
  const inScope = ((records ?? []) as RRow[]).filter((r) => {
    const cls = (r.class_name ?? "").trim() || (studentClass.get(r.student_id) ?? "");
    if (!cls) return false;
    if (input.onlyClasses && !input.onlyClasses.includes(cls)) return false;
    return !wanted || cls === wanted;
  });

  const byClass = new Map<string, RRow[]>();
  for (const r of inScope) {
    const cls =
      (r.class_name ?? "").trim() || (studentClass.get(r.student_id) ?? "");
    if (!cls) continue;
    const list = byClass.get(cls) ?? [];
    list.push(r);
    byClass.set(cls, list);
  }

  const classes: MonthlyClassRecap[] = [];
  for (const [cls, recs] of Array.from(byClass.entries())) {
    const days = new Set(recs.map((r) => r.date)).size;
    const members = roster.filter((s) => (s.class_name ?? "").trim() === cls);
    const byStudent = new Map<string, RRow[]>();
    for (const r of recs) {
      if (!studentClass.has(r.student_id)) continue;
      const list = byStudent.get(r.student_id) ?? [];
      list.push(r);
      byStudent.set(r.student_id, list);
    }
    const rows: MonthlyStudentRecap[] = members.map((s) => {
      const list = byStudent.get(s.id) ?? [];
      const hadir = list.filter((r) => r.status === "hadir").length;
      const terlambat = list.filter((r) => r.status === "terlambat").length;
      const izin = list.filter((r) => r.status === "izin").length;
      const sakit = list.filter((r) => r.status === "sakit").length;
      const alpa = list.filter((r) => r.status === "alpa").length;
      const total = hadir + terlambat + izin + sakit + alpa;
      return {
        id: s.id,
        full_name: s.full_name,
        student_number: s.student_number,
        hadir,
        terlambat,
        izin,
        sakit,
        alpa,
        total,
        percent:
          total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 100,
      };
    });
    const hadir = rows.reduce((a, r) => a + r.hadir, 0);
    const terlambat = rows.reduce((a, r) => a + r.terlambat, 0);
    const izin = rows.reduce((a, r) => a + r.izin, 0);
    const sakit = rows.reduce((a, r) => a + r.sakit, 0);
    const alpa = rows.reduce((a, r) => a + r.alpa, 0);
    const total = hadir + terlambat + izin + sakit + alpa;
    const attention = rows
      .map((r) => ({ name: r.full_name, reason: attentionReason(r) }))
      .filter((a): a is { name: string; reason: string } => a.reason !== null);
    classes.push({
      className: cls,
      days,
      hadir,
      terlambat,
      izin,
      sakit,
      alpa,
      total,
      percent:
        total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 100,
      rows,
      attention,
    });
  }
  classes.sort((a, b) => a.className.localeCompare(b.className, "id"));

  const totals = {
    days: new Set(inScope.map((r) => r.date)).size,
    hadir: classes.reduce((a, c) => a + c.hadir, 0),
    terlambat: classes.reduce((a, c) => a + c.terlambat, 0),
    izin: classes.reduce((a, c) => a + c.izin, 0),
    sakit: classes.reduce((a, c) => a + c.sakit, 0),
    alpa: classes.reduce((a, c) => a + c.alpa, 0),
    total: 0,
    percent: 100,
  };
  totals.total =
    totals.hadir + totals.terlambat + totals.izin + totals.sakit + totals.alpa;
  totals.percent =
    totals.total > 0
      ? Math.round(((totals.hadir + totals.terlambat) / totals.total) * 100)
      : 100;

  const allClasses = Array.from(
    new Set(roster.map((s) => (s.class_name ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "id"));

  return { month: cleanMonth, schoolYear, allClasses, classes, totals };
}
